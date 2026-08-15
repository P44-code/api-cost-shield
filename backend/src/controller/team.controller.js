const teamModel = require("../models/team");
const memberModel = require("../models/member");
const ChatHistory = require("../models/chatHistory");

async function createTeam(req, res) {
    try {

        const { teamName, budget, members } = req.body;

        if (!teamName || !budget || !members) {
            return res.status(400).json({
                message: "All fields are required"
            })
        }

        // ✅ No longer blocks on an existing team — users can own multiple teams.
        const team = await teamModel.create({
            teamName,
            budget,
            owner: req.user.id
        })

        if (members && members.length > 0) {
            const memberDocs = members.map(m => ({
                team: team._id,
                name: m.name,
                role: m.role,
                user: m.userId
            }));

            await memberModel.insertMany(memberDocs);
        }

        return res.status(201).json({
            message: "Team created successfully",
            team: {
                id: team._id,
                teamName: team.teamName,
                budget: team.budget,
                budgetUsed: team.budgetUsed,
                owner: team.owner
            }
        })

    } catch (error) {
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        })
    }
}

async function getTeam(req, res) {
    try {

        const id = req.params.id;

        const team = await teamModel.findById(id);

        if (!team) {
            return res.status(404).json({
                message: "team not found"
            })
        }

        const isOwner = team.owner.toString() === req.user.id;
        const isMember = await memberModel.findOne({ team: id, user: req.user.id });

        if (!isOwner && !isMember) {
            return res.status(403).json({
                message: "Access denied. You do not belong to this team."
            });
        }

        const members = await memberModel.find({ team: id });

        const totalBudgetUsed = team.budgetUsed;

        const percent = (totalBudgetUsed / team.budget) * 100;

        let warning;
        if (percent >= 100) warning = "BLOCKED";
        else if (percent >= 80) warning = "WARNING";
        else warning = "SAFE";

        return res.status(200).json({
            team: {
                id: team._id,
                teamName: team.teamName,
                budget: team.budget,
                budgetUsed: totalBudgetUsed,
                budgetRemaining: team.budget - totalBudgetUsed,
                warning,
                isOwner, // ✅ frontend uses this to show/hide member management controls
            },
            members,
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        })
    }
}

async function getMyTeams(req, res) {
    try {
        // Teams this user owns
        const ownedTeams = await teamModel.find({ owner: req.user.id });

        // Teams this user is a member of (but doesn't own)
        const memberships = await memberModel.find({ user: req.user.id }).select("team");
        const memberTeamIds = memberships.map((m) => m.team);
        const memberTeams = await teamModel.find({ _id: { $in: memberTeamIds } });

        // Merge and de-duplicate (in case someone is both owner and listed as member)
        const teamsMap = new Map();
        [...ownedTeams, ...memberTeams].forEach((t) => {
            teamsMap.set(t._id.toString(), t);
        });

        const teams = Array.from(teamsMap.values()).map((t) => ({
            id: t._id,
            teamName: t.teamName,
            budget: t.budget,
            budgetUsed: t.budgetUsed,
        }));

        return res.status(200).json({ teams });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        })
    }
}

async function deleteTeam(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: "Team id is required" });
        }

        const team = await teamModel.findById(id);

        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        if (team.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: "Only the team owner can delete this team" });
        }

        // Clean up members first so we don't leave orphaned rows behind
        await memberModel.deleteMany({ team: id });
        await teamModel.findByIdAndDelete(id);

        return res.status(200).json({ message: "Team deleted successfully" });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

async function getMemberUsage(req, res) {
    try {
        const teamId = req.params.id;

        const team = await teamModel.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        const isOwner = team.owner.toString() === req.user.id;
        const isMember = isOwner || Boolean(await memberModel.findOne({ team: teamId, user: req.user.id }));
        if (!isOwner && !isMember) {
            return res.status(403).json({ message: "Access denied. You do not belong to this team." });
        }

        // Group tokens by user — only "assistant" entries carry the real token count
        const grouped = await ChatHistory.aggregate([
            { $match: { team: team._id, role: "assistant" } },
            { $group: { _id: "$user", totalTokens: { $sum: "$tokensUsed" }, messageCount: { $sum: 1 } } },
        ]);

        // Attach display names via the Member collection
        const members = await memberModel.find({ team: teamId });
        const memberMap = new Map(members.map((m) => [m.user?.toString(), m]));

        const breakdown = grouped.map((g) => {
            const userId = g._id?.toString();
            const member = memberMap.get(userId);
            const isTeamOwner = userId === team.owner.toString();
            return {
                userId,
                // ⚠️ ASSUMPTION: no User model was shared, so we can't look up
                // the owner's real name if they have no Member entry. Falls
                // back to "Team Owner" in that case.
                name: member?.name || (isTeamOwner ? "Team Owner" : "Unknown user"),
                role: member?.role || (isTeamOwner ? "owner" : "unknown"),
                totalTokens: g.totalTokens,
                messageCount: g.messageCount,
            };
        }).sort((a, b) => b.totalTokens - a.totalTokens);

        return res.status(200).json({
            breakdown,
            totalTokens: breakdown.reduce((sum, b) => sum + b.totalTokens, 0),
        });

    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
}
async function getActivityLog(req, res) {
    try {
        const teamId = req.params.id;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);

        const team = await teamModel.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        const isOwner = team.owner.toString() === req.user.id;
        const isMember = isOwner || Boolean(await memberModel.findOne({ team: teamId, user: req.user.id }));
        if (!isOwner && !isMember) {
            return res.status(403).json({ message: "Access denied. You do not belong to this team." });
        }

        // Get distinct sessions, newest first, paginated
        const sessions = await ChatHistory.aggregate([
            { $match: { team: team._id } },
            { $group: { _id: "$sessionId", latestAt: { $max: "$createdAt" } } },
            { $sort: { latestAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
        ]);

        const sessionIds = sessions.map((s) => s._id);
        const entries = await ChatHistory.find({ team: teamId, sessionId: { $in: sessionIds } })
            .sort({ createdAt: 1 });

        const members = await memberModel.find({ team: teamId });
        const memberMap = new Map(members.map((m) => [m.user?.toString(), m]));

        // Pair up user+assistant entries per session
        const sessionMap = new Map();
        for (const entry of entries) {
            const key = entry.sessionId;
            if (!sessionMap.has(key)) sessionMap.set(key, {});
            const bucket = sessionMap.get(key);
            if (entry.role === "user") {
                bucket.prompt = entry.content;
                bucket.user = entry.user;
                bucket.createdAt = entry.createdAt;
            } else {
                bucket.reply = entry.content;
                bucket.tokensUsed = entry.tokensUsed;
            }
        }

        const activity = sessionIds
            .map((sessionId) => {
                const bucket = sessionMap.get(sessionId);
                if (!bucket) return null;
                const userId = bucket.user?.toString();
                const isTeamOwner = userId === team.owner.toString();
                const member = memberMap.get(userId);
                return {
                    sessionId,
                    name: member?.name || (isTeamOwner ? "Team Owner" : "Unknown user"),
                    prompt: bucket.prompt,
                    reply: bucket.reply,
                    tokensUsed: bucket.tokensUsed || 0,
                    createdAt: bucket.createdAt,
                };
            })
            .filter(Boolean);

        return res.status(200).json({ activity, page, limit, hasMore: sessions.length === limit });

    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
}


module.exports = { createTeam, getTeam, getMyTeams, deleteTeam, getMemberUsage, getActivityLog }