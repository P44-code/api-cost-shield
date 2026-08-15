import { useMemo, useState } from "react";

// Language tag is optional; newline after it is optional too —
// real LLM output sometimes puts code on the same line as the opening fence.
const CODE_BLOCK_PATTERN = /```(\w+)?[ \t]*\r?\n?([\s\S]*?)```/g;
const INLINE_CODE_PATTERN = /`([^`\n]+)`/g;

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!navigator?.clipboard) {
            console.error("Clipboard API not available in this browser");
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {
            console.error("Copy failed:", err?.message ?? err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="absolute top-2 right-2 text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded"
            aria-label="Copy code to clipboard"
        >
            {copied ? "Copied!" : "Copy"}
        </button>
    );
}

function CodeBlock({ language, code }) {
    return (
        <div className="relative my-2">
            <pre className="bg-slate-900 text-green-300 text-sm p-3 pr-16 rounded overflow-x-auto whitespace-pre-wrap break-words">
                <code>{code}</code>
            </pre>
            <CopyButton text={code} />
            {language && (
                <span className="absolute top-2 left-3 text-[10px] uppercase text-slate-400">
                    {language}
                </span>
            )}
        </div>
    );
}

function InlineText({ text, keyPrefix }) {
    // Splits on inline `code` spans within a plain-text chunk
    const segments = [];
    let lastIndex = 0;
    let match;
    let i = 0;
    const pattern = new RegExp(INLINE_CODE_PATTERN);

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push(text.slice(lastIndex, match.index));
        }
        segments.push(
            <code
                key={`${keyPrefix}-inline-${i++}`}
                className="bg-slate-700 text-amber-300 px-1 py-0.5 rounded text-xs"
            >
                {match[1]}
            </code>
        );
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        segments.push(text.slice(lastIndex));
    }

    return <p className="whitespace-pre-wrap">{segments}</p>;
}

/**
 * Renders an AI chat reply, splitting plain text (with inline code support)
 * from fenced code blocks. Falls back to plain text if content is empty.
 */
export default function ChatMessage({ content }) {
    const parts = useMemo(() => {
        if (!content) return [];

        const result = [];
        let lastIndex = 0;
        let match;
        let key = 0;

        // Fresh RegExp instance per parse — never share mutable global regex state
        const pattern = new RegExp(CODE_BLOCK_PATTERN);

        while ((match = pattern.exec(content)) !== null) {
            const [fullMatch, language, code] = match;

            if (match.index > lastIndex) {
                const textChunk = content.slice(lastIndex, match.index).trim();
                if (textChunk) {
                    result.push(<InlineText key={`text-${key++}`} text={textChunk} keyPrefix={key} />);
                }
            }

            const trimmedCode = code.trim();
            if (trimmedCode) {
                result.push(<CodeBlock key={`code-${key++}`} language={language} code={trimmedCode} />);
            }
            lastIndex = match.index + fullMatch.length;
        }

        if (lastIndex < content.length) {
            const remaining = content.slice(lastIndex).trim();
            if (remaining) {
                result.push(<InlineText key={`text-${key++}`} text={remaining} keyPrefix={key} />);
            }
        }

        return result;
    }, [content]);

    if (!content) {
        return <p className="text-slate-400 italic">No response</p>;
    }

    return parts.length > 0 ? <>{parts}</> : <InlineText text={content} keyPrefix="fallback" />;
}