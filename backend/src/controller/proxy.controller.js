const Groq = require("groq-sdk");
const teamModel = require("../models/team");
const memberModel = require("../models/member");
const ChatHistory = require("../models/chatHistory");

if (!process.env.GROQ_KEY) {
    throw new Error("GROQ_KEY env var is required to start this service");
}

const groq = new Groq({ apiKey: process.env.GROQ_KEY });

// ---- Constants (no more magic numbers) ----
const MODEL_NAME = "llama-3.3-70b-versatile";
const HISTORY_LIMIT = 4;
const HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_PROMPT_LENGTH = 4000; // characters, guard against abuse
const WARNING_THRESHOLD_PERCENT = 80;

// ⬇️ UPDATED: raised token limits so code responses don't get cut off
// before the closing ``` fence (that truncation was breaking the copy button).
const INTENT_CONFIG = {
    comparison: { maxTokens: 250 },
    code: { maxTokens: 600 },
    definition: { maxTokens: 100 },
    general: { maxTokens: 150 },
};

const FILLER_PATTERNS = [
    /\b(hey|hi|hello)\b/gi,
    /\bcan you please\b/gi,
    /\bcould you please\b/gi,
    /\bi was wondering\b/gi,
    /\bwould you mind\b/gi,
    /\bin detail\b/gi,
    /\bwith examples\b/gi,
    /\bexplain to me\b/gi,
    /\btell me about\b/gi,
    /\bcan you\b/gi,
];

const CONTEXT_WORDS_REGEX =
    /\b(it|its|this|that|they|these|those|he|she|above|same|more|also|previous|earlier|you said|the one|elaborate|continue|another)\b/i;

/**
 * Strips filler phrases from a prompt.
 * Falls back to the original prompt if cleaning empties it out,
 * so we never send blank content to the model.
 */
function cleanPrompt(prompt) {
    let cleaned = prompt;
    for (const pattern of FILLER_PATTERNS) {
        cleaned = cleaned.replace(pattern, "");
    }
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    return cleaned.length > 0 ? cleaned : prompt.trim();
}

function needsHistory(prompt) {
    return CONTEXT_WORDS_REGEX.test(prompt);
}

function detectIntent(prompt) {
    const lower = prompt.toLowerCase();
    if (/difference|compare|vs |versus|better than|which is/.test(lower)) {
        return { intentType: "comparison", ...INTENT_CONFIG.comparison };
    }
    if (/how to|implement|write|show me|example|code|build|create|debug/.test(lower)) {
        return { intentType: "code", ...INTENT_CONFIG.code };
    }
    if (/what is|what are|define|explain|meaning|who is/.test(lower)) {
        return { intentType: "definition", ...INTENT_CONFIG.definition };
    }
    return { intentType: "general", ...INTENT_CONFIG.general };
}

function buildSystemPrompt(intentType) {
    const base = `You are an ultra-efficient assistant.
STRICT RULES:
- Zero filler words
- Zero repetition
- Never restate the question
- Direct answer only
- ANY code, no matter how short, MUST be wrapped in a markdown fenced block with the language name, e.g. \`\`\`java ... \`\`\`
- Never output raw code without a fenced block, even inline`;

    const specific = {
        definition: `\n- One clear sentence definition\n- Maximum 2 supporting points\n- Max 40 words total`,
        comparison: `\n- Compare each option clearly\n- Format:\n  Option A: [point]\n  Option B: [point]\n  Best for: [reason]\n- Max 80 words total`,
        code: `\n- Code first, explanation after\n- Max 3 lines of explanation\n- Only relevant code\n- Always use a fenced code block with the correct language tag`,
        general: `\n- Max 50 words total`,
    };

    return base + (specific[intentType] ?? specific.general);
}

function getWarningLevel(percentUsed) {
    if (percentUsed >= 100) return "BLOCKED";
    if (percentUsed >= WARNING_THRESHOLD_PERCENT) return "WARNING";
    return "SAFE";
}

/** Fire-and-forget cleanup of old history rows. Never blocks the response. */
function pruneOldHistory(teamId, userId) {
    ChatHistory.deleteMany({
        team: teamId,
        user: userId,
        createdAt: { $lt: new Date(Date.now() - HISTORY_RETENTION_MS) },
    }).catch((err) => console.error("History cleanup error:", err?.message ?? err));
}

async function chat(req, res) {
    try {
        const { teamId, prompt } = req.body ?? {};
        const userId = req.user?.id;

        // 1. Validate input
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }
        if (!teamId || typeof prompt !== "string" || !prompt.trim()) {
            return res.status(400).json({ message: "teamId and prompt are required" });
        }
        if (prompt.length > MAX_PROMPT_LENGTH) {
            return res.status(400).json({
                message: `prompt exceeds max length of ${MAX_PROMPT_LENGTH} characters`,
            });
        }

        // 2. Find team
        const team = await teamModel.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // 3. Authorization: owner or member
        const isOwner = team.owner?.toString() === userId;
        const isMember = isOwner
            ? true
            : Boolean(await memberModel.findOne({ team: teamId, user: userId }));

        if (!isOwner && !isMember) {
            return res.status(403).json({ message: "Access denied — not a team member" });
        }

        // 4. Budget check (best-effort pre-check; real enforcement is atomic at step 10)
        if (team.budgetUsed >= team.budget) {
            return res.status(429).json({
                reply: null,
                warning: "BLOCKED",
                message: "Budget exhausted — request blocked",
            });
        }

        // 5. Prompt clean + intent
        const cleanedPrompt = cleanPrompt(prompt);
        const { maxTokens, intentType } = detectIntent(cleanedPrompt);

        // 6. History — scoped to recent activity only, most relevant when the prompt references prior context
        const history = needsHistory(cleanedPrompt)
            ? await ChatHistory.find({ team: teamId, user: userId })
                .sort({ createdAt: -1 })
                .limit(HISTORY_LIMIT)
                .then((rows) => rows.reverse())
            : [];

        const messages = [
            ...history.map((h) => ({ role: h.role, content: h.content })),
            { role: "user", content: cleanedPrompt },
        ];

        // 7. Groq call
        const completion = await groq.chat.completions.create({
            model: MODEL_NAME,
            max_tokens: maxTokens,
            messages: [{ role: "system", content: buildSystemPrompt(intentType) }, ...messages],
        });

        const reply = completion.choices?.[0]?.message?.content;
        const tokensUsed = completion.usage?.total_tokens ?? 0;

        if (!reply) {
            console.error("Groq returned no reply content", { teamId, userId });
            return res.status(502).json({ message: "Upstream model returned no response" });
        }

        // 8. Atomic budget increment WITH the check baked in — closes the race condition.
        // Only succeeds if budgetUsed is still below budget at the moment of update.
        const updatedTeam = await teamModel.findOneAndUpdate(
            { _id: teamId, budgetUsed: { $lt: team.budget } },
            { $inc: { budgetUsed: tokensUsed } },
            { new: true }
        );

        if (!updatedTeam) {
            // Budget was exhausted by a concurrent request between step 4 and now.
            return res.status(429).json({
                reply: null,
                warning: "BLOCKED",
                message: "Budget exhausted — request blocked",
            });
        }

        // 9. Save history
        const sessionId = Date.now().toString();
        await ChatHistory.insertMany([
            { team: teamId, user: userId, role: "user", content: prompt, sessionId, tokensUsed: 0 },
            { team: teamId, user: userId, role: "assistant", content: reply, sessionId, tokensUsed },
        ]);

        // 10. Background cleanup — fire and forget, does not delay response
        pruneOldHistory(teamId, userId);

        // 11. Response
        const percentUsed = (updatedTeam.budgetUsed / updatedTeam.budget) * 100;

        return res.status(200).json({
            reply,
            intentType,
            tokensUsed,
            budgetUsed: updatedTeam.budgetUsed,
            budgetRemaining: Math.max(updatedTeam.budget - updatedTeam.budgetUsed, 0),
            warning: getWarningLevel(percentUsed),
        });
    } catch (error) {
        console.error("Chat error:", error?.message ?? error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = { chat };