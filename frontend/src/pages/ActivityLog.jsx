import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 10000;
const PAGE_LIMIT = 20;

function formatTimestamp(isoString) {
    if (!isoString) return "—";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function truncate(text, max = 140) {
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

function ActivityLog() {
    const navigate = useNavigate();
    const teamId = sessionStorage.getItem("teamId");

    const [activity, setActivity] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");

    const fetchActivity = useCallback(async (pageNum, signal) => {
        if (!teamId) {
            setError("No team selected.");
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/team/activity/${teamId}`,
                {
                    withCredentials: true,
                    timeout: REQUEST_TIMEOUT_MS,
                    signal,
                    params: { page: pageNum, limit: PAGE_LIMIT },
                }
            );

            const newEntries = response.data?.activity ?? [];
            setActivity((prev) => (pageNum === 1 ? newEntries : [...prev, ...newEntries]));
            setHasMore(Boolean(response.data?.hasMore));
            setError("");

        } catch (err) {
            if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;

            if (err.response?.status === 401) {
                navigate("/login", { replace: true });
            } else if (err.response?.status === 403) {
                setError("You don't have access to this team's activity log.");
            } else if (err.code === "ECONNABORTED") {
                setError("Request timed out. Please check your connection.");
            } else if (!err.response) {
                setError("Cannot reach server. Please check your connection.");
            } else {
                setError("Failed to load activity log.");
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [teamId, navigate]);

    useEffect(() => {
        const controller = new AbortController();
        fetchActivity(1, controller.signal);
        return () => controller.abort();
    }, [fetchActivity]);

    function handleLoadMore() {
        const nextPage = page + 1;
        setPage(nextPage);
        setLoadingMore(true);
        fetchActivity(nextPage);
    }

    function handleRetry() {
        setLoading(true);
        setError("");
        setPage(1);
        fetchActivity(1);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <p className="text-gray-400 animate-pulse">Loading activity log...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={handleRetry}
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

                <h1 className="text-2xl font-bold mb-1">Activity Log</h1>
                <p className="text-gray-400 text-sm mb-8">
                    Recent chat activity across your team
                </p>

                {activity.length === 0 ? (
                    <div className="bg-gray-900 rounded-2xl p-8 text-center">
                        <p className="text-gray-600 text-sm">
                            No activity yet — chat sessions will show up here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activity.map((entry) => (
                            <div
                                key={entry.sessionId}
                                className="bg-gray-900 rounded-2xl p-5"
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm text-white font-medium">
                                        {entry.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {formatTimestamp(entry.createdAt)}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm text-blue-200 bg-blue-600/10 rounded-lg px-3 py-2">
                                        {truncate(entry.prompt)}
                                    </p>
                                    <p className="text-sm text-gray-300 bg-gray-800 rounded-lg px-3 py-2">
                                        {truncate(entry.reply)}
                                    </p>
                                </div>

                                <p className="text-gray-500 text-xs mt-2">
                                    {(entry.tokensUsed ?? 0).toLocaleString()} tokens used
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {hasMore && (
                    <div className="flex justify-center mt-6">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="bg-gray-800 hover:bg-gray-700 text-gray-300
                                       px-6 py-3 rounded-lg text-sm font-medium
                                       transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingMore ? "Loading..." : "Load more"}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}

export default ActivityLog;