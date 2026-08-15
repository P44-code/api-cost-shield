import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import ChatMessage from "../components/ChatMessage";
import { Home } from "lucide-react";
import Sidebar from "../components/Sidebar";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const POLL_INTERVAL_MS = 5000;
const REQUEST_TIMEOUT_MS = 10000;
const TOKENS_PER_MILLION = 1000000;
const WARNING_THRESHOLD_PERCENT = 80; // must match backend's WARNING_THRESHOLD_PERCENT in chat.js
const MEMBER_ROLES = ["admin", "developer", "viewer"];

function formatBudget(tokens) {
    if (tokens === null || tokens === undefined || isNaN(tokens)) {
        return "—";
    }
    if (tokens >= TOKENS_PER_MILLION) {
        return `$${(tokens / TOKENS_PER_MILLION).toFixed(2)}M`;
    }
    return `${tokens.toLocaleString()} tokens`;
}

function Dashboard() {
    const navigate = useNavigate();

    const [team, setTeam] = useState(null);
    const [members, setMembers] = useState([]);
    const [warning, setWarning] = useState("SAFE");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [messages, setMessages] = useState([]);
    const [prompt, setPrompt] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [chatError, setChatError] = useState("");

    // ✅ Member management state
    const [newMemberName, setNewMemberName] = useState("");
    const [newMemberRole, setNewMemberRole] = useState("developer");
    const [memberActionLoading, setMemberActionLoading] = useState(false);
    const [memberError, setMemberError] = useState("");

    const chatEndRef = useRef(null);
    const teamId = sessionStorage.getItem("teamId");

    const fetchTeam = useCallback(async (signal) => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/team/getTeam/${teamId}`,
                { withCredentials: true, timeout: REQUEST_TIMEOUT_MS, signal }
            );

            setTeam(response.data?.team ?? null);
            setMembers(response.data?.members ?? []);
            setWarning(response.data?.team?.warning ?? "SAFE");
            setError("");

        } catch (err) {
            if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;

            if (err.response?.status === 401) {
                navigate("/login", { replace: true });
            } else if (err.code === "ECONNABORTED") {
                setError("Request timed out. Please check your connection.");
            } else if (!err.response) {
                setError("Cannot reach server. Please check your connection.");
            } else {
                setError("Failed to load team data.");
            }
        } finally {
            setLoading(false);
        }
    }, [teamId, navigate]);

    useEffect(() => {
        if (!teamId) {
            navigate("/setup", { replace: true });
            return;
        }

        const controller = new AbortController();
        fetchTeam(controller.signal);

        return () => controller.abort();
    }, [teamId, fetchTeam, navigate]);

    useEffect(() => {
        if (!teamId) return;

        let interval;
        let controller;

        function poll() {
            controller = new AbortController();
            fetchTeam(controller.signal);
        }

        function startPolling() {
            interval = setInterval(poll, POLL_INTERVAL_MS);
        }

        function handleVisibility() {
            if (document.hidden) {
                clearInterval(interval);
            } else {
                poll();
                startPolling();
            }
        }

        startPolling();
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            clearInterval(interval);
            controller?.abort();
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [teamId, fetchTeam]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function handleChat(e) {
        e.preventDefault();

        if (!prompt.trim() || chatLoading) return;

        if (warning === "BLOCKED") {
            setChatError("Budget exhausted — chat blocked!");
            return;
        }

        const userMessage = prompt.trim();
        setPrompt("");
        setChatError("");

        setMessages(prev => [...prev, {
            id: `user-${Date.now()}`,
            role: "user",
            content: userMessage,
        }]);

        setChatLoading(true);

        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/proxy/chat`,
                { teamId, prompt: userMessage },
                { withCredentials: true, timeout: REQUEST_TIMEOUT_MS }
            );

            setMessages(prev => [...prev, {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: response.data?.reply || "No response received.",
                tokens: response.data?.tokensUsed,
            }]);

            fetchTeam();

        } catch (err) {
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                role: "error",
                content: err.response?.status === 429
                    ? "Budget exhausted — request blocked!"
                    : err.code === "ECONNABORTED"
                        ? "Request timed out. Please try again."
                        : err.response?.data?.message || "Something went wrong.",
            }]);
        } finally {
            setChatLoading(false);
        }
    }

    async function handleLogout() {
        try {
            await axios.post(
                `${API_BASE_URL}/api/auth/logout`,
                {},
                { withCredentials: true, timeout: REQUEST_TIMEOUT_MS }
            );
            sessionStorage.removeItem("teamId");
            navigate("/login", { replace: true });
        } catch {
            sessionStorage.removeItem("teamId");
            navigate("/login", { replace: true });
        }
    }

    // ✅ Add a new member
    async function handleAddMember(e) {
        e.preventDefault();
        if (!newMemberName.trim() || memberActionLoading) return;

        setMemberActionLoading(true);
        setMemberError("");

        try {
            await axios.post(
                `${API_BASE_URL}/api/team/${teamId}/members`,
                { name: newMemberName.trim(), role: newMemberRole },
                { withCredentials: true, timeout: REQUEST_TIMEOUT_MS }
            );
            setNewMemberName("");
            setNewMemberRole("developer");
            await fetchTeam();
        } catch (err) {
            setMemberError(err.response?.data?.message || "Failed to add member.");
        } finally {
            setMemberActionLoading(false);
        }
    }

    // ✅ Change a member's role inline
    async function handleRoleChange(memberId, newRole) {
        setMemberError("");
        try {
            await axios.patch(
                `${API_BASE_URL}/api/team/${teamId}/members/${memberId}`,
                { role: newRole },
                { withCredentials: true, timeout: REQUEST_TIMEOUT_MS }
            );
            await fetchTeam();
        } catch (err) {
            setMemberError(err.response?.data?.message || "Failed to update role.");
        }
    }

    // ✅ Remove a member
    async function handleRemoveMember(memberId) {
        setMemberError("");
        try {
            await axios.delete(
                `${API_BASE_URL}/api/team/${teamId}/members/${memberId}`,
                { withCredentials: true, timeout: REQUEST_TIMEOUT_MS }
            );
            await fetchTeam();
        } catch (err) {
            setMemberError(err.response?.data?.message || "Failed to remove member.");
        }
    }

    const budgetRemaining = team ? team.budget - team.budgetUsed : 0;
    const budgetPercent = team && team.budget > 0
        ? Math.min((team.budgetUsed / team.budget) * 100, 100)
        : 0;

    const warningConfig = {
        SAFE: { bar: "bg-green-500", text: "text-green-400", label: "✅ Safe" },
        WARNING: { bar: "bg-yellow-500", text: "text-yellow-400", label: "⚠️ Warning" },
        BLOCKED: { bar: "bg-red-500", text: "text-red-400", label: "🚫 Blocked" },
    };

    const config = warningConfig[warning] || warningConfig.SAFE;
    const isOwner = Boolean(team?.isOwner);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <p className="text-gray-400 animate-pulse">Loading dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => fetchTeam()}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <Sidebar />
                        <div>
                            <h1 className="text-2xl font-bold">{team?.teamName}</h1>
                            <p className="text-gray-400 text-sm">API Cost Shield Dashboard</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300
                   px-4 py-2 rounded-lg text-sm transition"
                    >
                        Logout
                    </button>
                </div>

                {/* Warning Banner */}
                {warning !== "SAFE" && (
                    <div
                        role="alert"
                        className={`border px-4 py-3 rounded-lg mb-6 text-sm font-medium
                            ${warning === "BLOCKED"
                                ? "bg-red-500/10 border-red-500 text-red-400"
                                : "bg-yellow-500/10 border-yellow-500 text-yellow-400"
                            }`}
                    >
                        {warning === "BLOCKED"
                            ? "🚫 Budget exhausted — all requests are blocked!"
                            : `⚠️ Warning — ${WARNING_THRESHOLD_PERCENT}% budget used! Use tokens wisely.`
                        }
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                    {/* Budget Card */}
                    <div className="bg-gray-900 rounded-2xl p-6">
                        <h2 className="text-gray-400 text-sm mb-4">Budget Status</h2>

                        <div className="flex justify-between mb-2">
                            <span className="text-sm text-gray-400">
                                Used:{" "}
                                <span className="text-white font-medium">
                                    {formatBudget(team?.budgetUsed)}
                                </span>
                            </span>
                            <span className="text-sm text-gray-400">
                                Total:{" "}
                                <span className="text-white font-medium">
                                    {formatBudget(team?.budget)}
                                </span>
                            </span>
                        </div>

                        <div
                            role="progressbar"
                            aria-label="Budget used"
                            aria-valuenow={Math.round(budgetPercent)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="w-full bg-gray-700 rounded-full h-3 mb-3"
                        >
                            <div
                                className={`h-3 rounded-full transition-all duration-500 ${config.bar}`}
                                style={{ width: `${budgetPercent}%` }}
                            />
                        </div>

                        <div className="flex justify-between">
                            <span className={`text-sm font-medium ${config.text}`}>
                                {config.label}
                            </span>
                            <span className="text-sm text-gray-400">
                                Remaining:{" "}
                                <span className="text-white font-medium">
                                    {formatBudget(budgetRemaining)}
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* Members Card */}
                    <div className="bg-gray-900 rounded-2xl p-6">
                        <h2 className="text-gray-400 text-sm mb-4">
                            Team Members ({members.length})
                        </h2>

                        {memberError && (
                            <div
                                role="alert"
                                className="bg-red-500/10 border border-red-500 text-red-400
                                           px-3 py-2 rounded-lg mb-3 text-xs"
                            >
                                {memberError}
                            </div>
                        )}

                        {members.length === 0 ? (
                            <p className="text-gray-600 text-sm mb-3">No members added.</p>
                        ) : (
                            <div className="space-y-2 mb-3">
                                {members.map((member) => (
                                    <div
                                        key={member._id ?? member.id}
                                        className="flex justify-between items-center gap-2
                                                   bg-gray-800 px-3 py-2 rounded-lg"
                                    >
                                        <span className="text-sm text-white truncate flex-1">
                                            {member.name}
                                        </span>

                                        {isOwner ? (
                                            <>
                                                <label htmlFor={`role-${member._id}`} className="sr-only">
                                                    Role for {member.name}
                                                </label>
                                                <select
                                                    id={`role-${member._id}`}
                                                    value={member.role}
                                                    onChange={(e) => handleRoleChange(member._id, e.target.value)}
                                                    className="bg-gray-700 text-white text-xs px-2 py-1 rounded"
                                                >
                                                    {MEMBER_ROLES.map((r) => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => handleRemoveMember(member._id)}
                                                    aria-label={`Remove ${member.name}`}
                                                    className="text-red-400 hover:text-red-300 text-xs px-1"
                                                >
                                                    ✕
                                                </button>
                                            </>
                                        ) : (
                                            <span className={`text-xs px-2 py-1 rounded-full
                                                ${member.role === "admin"
                                                    ? "bg-purple-500/20 text-purple-400"
                                                    : member.role === "developer"
                                                        ? "bg-blue-500/20 text-blue-400"
                                                        : "bg-gray-500/20 text-gray-400"
                                                }`}>
                                                {member.role}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {isOwner && (
                            <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-2">
                                <label htmlFor="new-member-name" className="sr-only">New member name</label>
                                <input
                                    id="new-member-name"
                                    type="text"
                                    value={newMemberName}
                                    onChange={(e) => setNewMemberName(e.target.value)}
                                    placeholder="New member name"
                                    disabled={memberActionLoading}
                                    className="flex-1 bg-gray-800 text-white px-3 py-2
                                               rounded-lg outline-none focus:ring-2
                                               focus:ring-blue-500 text-sm disabled:opacity-50"
                                />
                                <label htmlFor="new-member-role" className="sr-only">New member role</label>
                                <select
                                    id="new-member-role"
                                    value={newMemberRole}
                                    onChange={(e) => setNewMemberRole(e.target.value)}
                                    disabled={memberActionLoading}
                                    className="bg-gray-800 text-white px-2 py-2 rounded-lg text-sm disabled:opacity-50"
                                >
                                    {MEMBER_ROLES.map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                                <button
                                    type="submit"
                                    disabled={memberActionLoading || !newMemberName.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2
                                               rounded-lg text-sm font-medium transition
                                               disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {memberActionLoading ? "..." : "+ Add"}
                                </button>
                            </form>
                        )}
                    </div>

                </div>

                {/* Chat Box */}
                <div className="bg-gray-900 rounded-2xl p-6">
                    <h2 className="text-gray-400 text-sm mb-4">Chat with AI</h2>

                    <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
                        {messages.length === 0 && (
                            <p className="text-gray-600 text-sm text-center py-4">
                                Ask anything — AI will respond concisely!
                            </p>
                        )}

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`px-4 py-3 rounded-lg text-sm leading-relaxed
                                    ${msg.role === "user"
                                        ? "bg-blue-600/20 text-blue-100 ml-8"
                                        : msg.role === "assistant"
                                            ? "bg-gray-800 text-gray-200 mr-8"
                                            : "bg-red-500/10 text-red-400"
                                    }`}
                            >
                                <ChatMessage content={msg.content} />
                                {msg.tokens && (
                                    <span className="text-xs text-gray-500 ml-2">
                                        ({msg.tokens} tokens)
                                    </span>
                                )}
                            </div>
                        ))}

                        {chatLoading && (
                            <div className="bg-gray-800 px-4 py-3 rounded-lg mr-8">
                                <span className="text-gray-400 text-sm animate-pulse">
                                    AI is thinking...
                                </span>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {chatError && (
                        <div
                            role="alert"
                            className="bg-red-500/10 border border-red-500 text-red-400
                                       px-4 py-3 rounded-lg mb-4 text-sm"
                        >
                            {chatError}
                        </div>
                    )}

                    <form onSubmit={handleChat} className="flex gap-3">
                        <label htmlFor="chat-prompt" className="sr-only">
                            Chat message
                        </label>
                        <input
                            id="chat-prompt"
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={
                                warning === "BLOCKED"
                                    ? "Budget exhausted — chat disabled"
                                    : "Ask anything..."
                            }
                            disabled={chatLoading || warning === "BLOCKED"}
                            className="flex-1 bg-gray-800 text-white px-4 py-3
                                       rounded-lg outline-none focus:ring-2
                                       focus:ring-blue-500 text-sm disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={chatLoading || warning === "BLOCKED" || !prompt.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white
                                       px-6 py-3 rounded-lg text-sm font-medium
                                       transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {chatLoading ? "..." : "Send"}
                        </button>
                    </form>

                </div>

            </div>
        </div>
    );
}

export default Dashboard;