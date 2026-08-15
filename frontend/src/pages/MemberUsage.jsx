import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 10000;
const TOKENS_PER_MILLION = 1000000;

function formatTokens(tokens) {
    if (tokens === null || tokens === undefined || isNaN(tokens)) return "—";
    if (tokens >= TOKENS_PER_MILLION) {
        return `$${(tokens / TOKENS_PER_MILLION).toFixed(2)}M`;
    }
    return `${tokens.toLocaleString()} tokens`;
}

const ROLE_STYLES = {
    admin: "bg-purple-500/20 text-purple-400",
    owner: "bg-yellow-500/20 text-yellow-400",
    developer: "bg-blue-500/20 text-blue-400",
};
const DEFAULT_ROLE_STYLE = "bg-gray-500/20 text-gray-400";

function MemberUsage() {
    const navigate = useNavigate();
    const teamId = sessionStorage.getItem("teamId");

    const [breakdown, setBreakdown] = useState([]);
    const [totalTokens, setTotalTokens] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchUsage = useCallback(async (signal) => {
        if (!teamId) {
            setError("No team selected.");
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/team/usage/${teamId}/byMember`,
                { withCredentials: true, timeout: REQUEST_TIMEOUT_MS, signal }
            );

            setBreakdown(response.data?.breakdown ?? []);
            setTotalTokens(response.data?.totalTokens ?? 0);
            setError("");

        } catch (err) {
            if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;

            if (err.response?.status === 401) {
                navigate("/login", { replace: true });
            } else if (err.response?.status === 403) {
                setError("You don't have access to this team's usage data.");
            } else if (err.code === "ECONNABORTED") {
                setError("Request timed out. Please check your connection.");
            } else if (!err.response) {
                setError("Cannot reach server. Please check your connection.");
            } else {
                setError("Failed to load usage breakdown.");
            }
        } finally {
            setLoading(false);
        }
    }, [teamId, navigate]);

    useEffect(() => {
        const controller = new AbortController();
        fetchUsage(controller.signal);
        return () => controller.abort();
    }, [fetchUsage]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <p className="text-gray-400 animate-pulse">Loading usage breakdown...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => { setLoading(true); fetchUsage(); }}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6 pt-20">
            <div className="max-w-4xl mx-auto">

                <h1 className="text-2xl font-bold mb-1">Per-Member Usage</h1>
                <p className="text-gray-400 text-sm mb-8">
                    Token consumption broken down by team member
                </p>

                <div className="bg-gray-900 rounded-2xl p-5 mb-6">
                    <p className="text-gray-400 text-xs mb-1">Total tokens used (all members)</p>
                    <p className="text-xl font-semibold">{formatTokens(totalTokens)}</p>
                </div>

                <div className="bg-gray-900 rounded-2xl p-6">
                    {breakdown.length === 0 ? (
                        <p className="text-gray-600 text-sm text-center py-8">
                            No usage recorded yet — chat activity will show up here.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {breakdown.map((entry) => {
                                const share = totalTokens > 0
                                    ? (entry.totalTokens / totalTokens) * 100
                                    : 0;
                                return (
                                    <div
                                        key={entry.userId}
                                        className="bg-gray-800 rounded-lg px-4 py-3"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-white font-medium">
                                                    {entry.name}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full
                                                    ${ROLE_STYLES[entry.role] ?? DEFAULT_ROLE_STYLE}`}>
                                                    {entry.role}
                                                </span>
                                            </div>
                                            <span className="text-sm text-gray-300 font-medium">
                                                {formatTokens(entry.totalTokens)}
                                            </span>
                                        </div>

                                        <div
                                            role="progressbar"
                                            aria-label={`${entry.name} share of total usage`}
                                            aria-valuenow={Math.round(share)}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            className="w-full bg-gray-700 rounded-full h-2 mb-1"
                                        >
                                            <div
                                                className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                                                style={{ width: `${share}%` }}
                                            />
                                        </div>

                                        <p className="text-gray-500 text-xs">
                                            {entry.messageCount} message{entry.messageCount === 1 ? "" : "s"} · {share.toFixed(1)}% of total
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default MemberUsage;