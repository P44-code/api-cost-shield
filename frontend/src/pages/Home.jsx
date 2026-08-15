import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ✅ NaN aur null handle karo
function formatBudget(tokens) {
    const n = Number(tokens);
    if (!n || isNaN(n)) return "0 tokens";
    if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}`;
    return `${n.toLocaleString()} tokens`;
}

// ✅ Warning config ek jagah
const WARNING = {
    SAFE: { dot: "bg-green-400", text: "text-green-400", bar: "bg-white", label: "✅ Safe" },
    WARNING: { dot: "bg-yellow-400", text: "text-yellow-400", bar: "bg-yellow-500", label: "⚠️ Warning" },
    BLOCKED: { dot: "bg-red-400", text: "text-red-400", bar: "bg-red-500", label: "🚫 Blocked" },
};

// ✅ Custom confirmation modal — replaces the native browser confirm() popup
function DeleteConfirmModal({ teamName, onConfirm, onCancel, deleting }) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={onCancel}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm"
            >
                <h2 id="delete-modal-title" className="text-lg font-semibold text-white mb-2">
                    Delete team?
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                    Are you sure you want to delete{" "}
                    <span className="text-white font-medium">{teamName}</span>? This cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={deleting}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300
                                   py-2.5 rounded-lg text-sm font-medium transition
                                   disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white
                                   py-2.5 rounded-lg text-sm font-medium transition
                                   disabled:opacity-50"
                    >
                        {deleting ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState(null);
    const [teamPendingDelete, setTeamPendingDelete] = useState(null); // ✅ team object waiting for confirmation

    useEffect(() => {
        fetchTeams();
    }, []);

    async function fetchTeams() {
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(
                `${API_BASE_URL}/api/team/myteams`,
                { withCredentials: true }
            );
            setTeams(res.data.teams || []);
        } catch (err) {
            if (err.response?.status === 401) {
                navigate("/login", { replace: true });
            } else {
                setError("Failed to load teams. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    function openDashboard(team) {
        const id = (team.id || team._id)?.toString();
        if (!id) return;
        sessionStorage.setItem("teamId", id);
        navigate("/dashboard", { replace: true });
    }

    function goToSetup() {
        sessionStorage.removeItem("teamId");
        navigate("/setup");
    }

    async function handleLogout() {
        try {
            await axios.post(
                `${API_BASE_URL}/api/auth/logout`,
                {},
                { withCredentials: true }
            );
        } catch (err) {
            console.error("Logout error:", err.message);
        } finally {
            sessionStorage.clear();
            navigate("/login", { replace: true });
        }
    }

    // ✅ Opens the custom modal instead of window.confirm
    function requestDeleteTeam(e, team) {
        e.stopPropagation();
        setTeamPendingDelete(team);
    }

    function cancelDelete() {
        if (deletingId) return; // don't allow closing mid-request
        setTeamPendingDelete(null);
    }

    async function confirmDeleteTeam() {
        const team = teamPendingDelete;
        const id = (team?.id || team?._id)?.toString();
        if (!id || deletingId) return;

        setDeletingId(id);
        setError("");

        try {
            await axios.delete(
                `${API_BASE_URL}/api/team/${id}`,
                { withCredentials: true }
            );

            setTeams((prev) => prev.filter((t) => (t.id || t._id)?.toString() !== id));

            if (sessionStorage.getItem("teamId") === id) {
                sessionStorage.removeItem("teamId");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to delete team. Please try again.");
        } finally {
            setDeletingId(null);
            setTeamPendingDelete(null);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col
                            items-center justify-center gap-4">
                <p className="text-gray-500 animate-pulse text-sm">
                    Loading your teams...
                </p>
                <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-white text-xs transition">
                    Logout
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">

            {/* Header */}
            <div className="border-b border-gray-800/50 px-6 py-4
                            flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white flex items-center
                                    justify-center">
                        <svg width="13" height="13" viewBox="0 0 24 24"
                            fill="none" stroke="black" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" />
                        </svg>
                    </div>
                    <span className="font-semibold text-white text-sm">
                        Cost Shield
                    </span>
                </div>
                <button
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-white text-sm transition">
                    Logout
                </button>
            </div>

            <div className="max-w-lg mx-auto px-6 py-12">

                <h1 className="text-2xl font-bold text-white mb-1">
                    Your Teams
                </h1>
                <p className="text-gray-600 text-sm mb-8">
                    {teams.length > 0
                        ? `${teams.length} team${teams.length > 1 ? "s" : ""} — select to open dashboard`
                        : "No teams yet — create your first one"
                    }
                </p>

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20
                                    text-red-400 px-4 py-3 rounded-xl mb-4
                                    text-sm flex justify-between items-center">
                        <span>{error}</span>
                        <button
                            onClick={fetchTeams}
                            className="text-red-400 hover:text-red-300
                                       underline text-xs ml-4">
                            Retry
                        </button>
                    </div>
                )}

                {/* Teams list */}
                {teams.length > 0 ? (
                    <div className="space-y-2 mb-6">
                        {teams.map((team) => {
                            const id = (team.id || team._id)?.toString();
                            const w = WARNING[team.warning] || WARNING.SAFE;
                            const percent = team.budget > 0
                                ? Math.min((team.budgetUsed / team.budget) * 100, 100)
                                : 0;
                            const isDeleting = deletingId === id;

                            return (
                                <div
                                    key={id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => !isDeleting && openDashboard(team)}
                                    onKeyDown={(e) => {
                                        if ((e.key === "Enter" || e.key === " ") && !isDeleting) {
                                            e.preventDefault();
                                            openDashboard(team);
                                        }
                                    }}
                                    className={`w-full bg-gray-900 hover:bg-gray-800/80
                                               border border-gray-800 hover:border-gray-700
                                               rounded-xl px-5 py-4 text-left cursor-pointer
                                               transition-all duration-200 group
                                               ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}>

                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${w.dot}`} />
                                            <span className="text-white font-medium text-sm">
                                                {team.teamName}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={(e) => requestDeleteTeam(e, team)}
                                                disabled={isDeleting}
                                                aria-label={`Delete ${team.teamName}`}
                                                className="text-gray-600 hover:text-red-400
                                                           transition-colors disabled:opacity-40
                                                           disabled:cursor-not-allowed"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                            <span className="text-gray-600 group-hover:text-white
                                                             text-sm transition-colors">
                                                →
                                            </span>
                                        </div>
                                    </div>

                                    {/* Budget bar */}
                                    <div className="w-full bg-gray-800 rounded-full h-1">
                                        <div
                                            className={`h-1 rounded-full transition-all
                                                        duration-500 ${w.bar}`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>

                                    {/* Budget text */}
                                    <div className="flex justify-between mt-2">
                                        <span className={`text-xs ${w.text}`}>
                                            {isDeleting ? "Deleting..." : w.label}
                                        </span>
                                        <span className="text-gray-600 text-xs">
                                            {formatBudget(team.budgetUsed)} / {formatBudget(team.budget)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Empty state */
                    <div className="bg-gray-900 border border-gray-800 rounded-xl
                                    p-10 text-center mb-6">
                        <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center
                                        justify-center mx-auto mb-4">
                            <svg width="20" height="20" viewBox="0 0 24 24"
                                fill="none" stroke="#4b5563" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <p className="text-gray-400 text-sm font-medium mb-1">
                            No teams yet
                        </p>
                        <p className="text-gray-600 text-xs mb-6">
                            Create a team to start tracking AI budget
                        </p>
                        <button
                            onClick={goToSetup}
                            className="bg-white text-black text-sm font-semibold
                                       px-6 py-2.5 rounded-lg hover:bg-gray-100
                                       transition-all duration-200">
                            Create your first team →
                        </button>
                    </div>
                )}

                {/* Create new team */}
                {teams.length > 0 && (
                    <button
                        onClick={goToSetup}
                        className="w-full border border-dashed border-gray-800
                                   hover:border-gray-600 text-gray-600 hover:text-white
                                   py-3.5 rounded-xl text-sm transition-all duration-200">
                        + Create new team
                    </button>
                )}

            </div>

            {/* ✅ Custom delete confirmation modal — replaces window.confirm() */}
            {teamPendingDelete && (
                <DeleteConfirmModal
                    teamName={teamPendingDelete.teamName}
                    onConfirm={confirmDeleteTeam}
                    onCancel={cancelDelete}
                    deleting={Boolean(deletingId)}
                />
            )}
        </div>
    );
}