import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const TOKENS_PER_DOLLAR = 1000000;
const MIN_DOLLARS = 0.01;
const MIN_TOKENS = 100;
const REQUEST_TIMEOUT_MS = 10000;

function TeamSetup() {
    const navigate = useNavigate();

    const [teamName, setTeamName] = useState("");
    const [budget, setBudget] = useState("");
    const [budgetType, setBudgetType] = useState("dollars");
    const [members, setMembers] = useState([
        { id: "member-0", name: "", role: "developer" }
    ]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [checkingTeam, setCheckingTeam] = useState(true);
    const [existingTeam, setExistingTeam] = useState(null);

    const memberIdCounter = useRef(1);

    // ✅ /api/team/myTeams cookie se current user ki teams deta hai —
    // koi ID guess karne ki zaroorat nahi. Response: { teams: [...] }
    useEffect(() => {
        const controller = new AbortController();

        axios.get(`${API_BASE_URL}/api/team/myTeams`, {
            withCredentials: true,
            timeout: REQUEST_TIMEOUT_MS,
            signal: controller.signal
        })
            .then((response) => {
                const teams = response.data?.teams ?? [];

                if (teams.length > 0) {
                    // ✅ Abhi UI single-team hai, isliye pehli team le rahe hain
                    const team = teams[0];
                    setExistingTeam(team);
                    sessionStorage.setItem("teamId", team.id);
                } else {
                    // ✅ Koi team nahi — valid state, form dikhega
                    sessionStorage.removeItem("teamId");
                }
            })
            .catch((err) => {
                if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;

                if (err.response?.status === 401) {
                    // protect middleware ne reject kiya — session invalid
                    navigate("/login", { replace: true });
                    return;
                }

                console.error("Failed to check existing teams:", err);
                setError("Couldn't verify your team. Please check your connection and refresh.");
            })
            .finally(() => setCheckingTeam(false));

        return () => controller.abort();
    }, [navigate]);

    function handleMemberChange(id, field, value) {
        setMembers(prev =>
            prev.map(m => (m.id === id ? { ...m, [field]: value } : m))
        );
    }

    function addMember() {
        const newId = `member-${memberIdCounter.current++}`;
        setMembers(prev => [...prev, { id: newId, name: "", role: "developer" }]);
    }

    function removeMember(id) {
        if (members.length === 1) return;
        setMembers(prev => prev.filter(m => m.id !== id));
    }

    function validateBudget(value) {
        const num = Number(value);
        if (!value || isNaN(num) || num <= 0) {
            return "Budget must be a valid positive number.";
        }
        if (budgetType === "dollars") {
            if (num < MIN_DOLLARS) return `Minimum budget is $${MIN_DOLLARS}.`;
            if (!/^\d+(\.\d{1,2})?$/.test(value)) return "Max 2 decimal places allowed.";
        }
        if (budgetType === "tokens") {
            if (!Number.isInteger(num)) return "Token budget must be a whole number.";
            if (num < MIN_TOKENS) return `Minimum ${MIN_TOKENS} tokens required.`;
        }
        return null;
    }

    function getHelperText() {
        const num = Number(budget);
        if (budgetType === "dollars") {
            if (!num || isNaN(num) || num <= 0) return "Enter dollar amount — e.g. 10";
            return `≈ ${(num * TOKENS_PER_DOLLAR).toLocaleString()} tokens`;
        }
        if (!num || isNaN(num) || num <= 0) return "Enter token amount — e.g. 5000";
        return `≈ $${(num / TOKENS_PER_DOLLAR).toFixed(2)}`;
    }

    function switchBudgetType(type) {
        setBudgetType(type);
        setBudget("");
        setError("");
    }

    function updateTeamName(value) {
        setTeamName(value);
        if (error) setError("");
    }

    function updateBudget(value) {
        setBudget(value);
        if (error) setError("");
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (loading) return;

        if (!teamName.trim()) {
            setError("Team name is required.");
            return;
        }

        const budgetError = validateBudget(budget);
        if (budgetError) {
            setError(budgetError);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const filteredMembers = members
                .filter(m => m.name.trim() !== "")
                .map(({ name, role }) => ({ name: name.trim(), role }));

            const finalBudget = budgetType === "dollars"
                ? Math.floor(Number(budget) * TOKENS_PER_DOLLAR)
                : Math.floor(Number(budget));

            const response = await axios.post(
                `${API_BASE_URL}/api/team/createTeam`,
                {
                    teamName: teamName.trim(),
                    budget: finalBudget,
                    members: filteredMembers,
                },
                { withCredentials: true, timeout: REQUEST_TIMEOUT_MS }
            );

            // ✅ Backend "team.id" bhejta hai (_id nahi) — controller confirm karta hai
            const teamId = response.data?.team?.id;

            if (!teamId) {
                setError("Team created but ID missing — please refresh.");
                return;
            }

            sessionStorage.setItem("teamId", teamId);
            navigate("/home", { replace: true });

        } catch (err) {
            if (err.code === "ECONNABORTED") {
                setError("Request timed out. Please try again.");
            } else if (!err.response) {
                setError("Network error. Server is down or you are offline.");
            } else if (err.response.status === 400 && err.response.data?.teamId) {
                // ✅ Backend bata raha hai "You already have a team" — sync ho jao
                sessionStorage.setItem("teamId", err.response.data.teamId);
                navigate("/dashboard", { replace: true });
            } else {
                setError(err.response.data?.message || "Something went wrong.");
            }
        } finally {
            setLoading(false);
        }
    }

    function handleCreateNewTeam() {
        sessionStorage.removeItem("teamId");
        setExistingTeam(null);
    }

    if (checkingTeam) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <p className="text-gray-400 animate-pulse">Checking your account...</p>
            </div>
        );
    }

    if (existingTeam) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="bg-gray-900 p-8 rounded-2xl shadow-lg w-full max-w-lg text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">
                        You already have a team
                    </h1>
                    <p className="text-gray-400 mb-6 text-sm">
                        <span className="text-white font-medium">{existingTeam.teamName}</span> is
                        already set up on this account.
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate("/dashboard", { replace: true })}
                            className="w-full bg-white hover:bg-gray-100 text-black
                                       font-semibold py-3 rounded-lg transition"
                        >
                            Go to Dashboard →
                        </button>
                        <button
                            onClick={handleCreateNewTeam}
                            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300
                                       font-medium py-3 rounded-lg transition text-sm"
                        >
                            Create a different team instead
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className={`bg-gray-900 p-8 rounded-2xl shadow-lg w-full max-w-lg
                            transition-opacity duration-200
                            ${loading ? "opacity-60 pointer-events-none" : ""}`}>

                <h1 className="text-2xl font-bold text-white mb-2">
                    Create Your Team
                </h1>
                <p className="text-gray-400 mb-6 text-sm">
                    Set up your team name, budget and members
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-400
                                    px-4 py-3 rounded-lg mb-4 text-sm" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">

                    <div>
                        <label htmlFor="team-name" className="text-gray-400 text-sm mb-1 block">
                            Team Name
                        </label>
                        <input
                            id="team-name"
                            type="text"
                            value={teamName}
                            onChange={(e) => updateTeamName(e.target.value)}
                            placeholder="DevSquad"
                            disabled={loading}
                            className="w-full bg-gray-800 text-white px-4 py-3
                                       rounded-lg outline-none focus:ring-2
                                       focus:ring-white/20 text-sm disabled:opacity-50"
                        />
                    </div>

                    <div>
                        <label className="text-gray-400 text-sm mb-2 block">
                            Budget
                        </label>

                        <div className="flex gap-2 mb-3 p-1 bg-gray-800 rounded-lg">
                            <button
                                type="button"
                                onClick={() => switchBudgetType("dollars")}
                                className={`flex-1 py-2 rounded-md text-sm font-medium
                                            transition-all duration-200
                                    ${budgetType === "dollars"
                                        ? "bg-white text-black shadow"
                                        : "text-gray-400 hover:text-white"
                                    }`}>
                                Dollars ($)
                            </button>
                            <button
                                type="button"
                                onClick={() => switchBudgetType("tokens")}
                                className={`flex-1 py-2 rounded-md text-sm font-medium
                                            transition-all duration-200
                                    ${budgetType === "tokens"
                                        ? "bg-white text-black shadow"
                                        : "text-gray-400 hover:text-white"
                                    }`}>
                                Tokens
                            </button>
                        </div>

                        <div className="relative">
                            {budgetType === "dollars" && (
                                <span className="absolute left-3 top-1/2 -translate-y-1/2
                                                 text-gray-400 text-sm font-medium">$</span>
                            )}
                            <label htmlFor="budget-input" className="sr-only">
                                Budget amount in {budgetType}
                            </label>
                            <input
                                id="budget-input"
                                type="number"
                                value={budget}
                                onChange={(e) => updateBudget(e.target.value)}
                                placeholder={budgetType === "dollars" ? "10.00" : "5000"}
                                min={budgetType === "dollars" ? MIN_DOLLARS : MIN_TOKENS}
                                step={budgetType === "dollars" ? "0.01" : "1"}
                                disabled={loading}
                                className={`w-full bg-gray-800 text-white py-3 rounded-lg
                                           outline-none focus:ring-2 focus:ring-white/20
                                           text-sm disabled:opacity-50
                                           ${budgetType === "dollars" ? "pl-7 pr-4" : "px-4"}`}
                            />
                        </div>

                        <p className="text-gray-500 text-xs mt-1.5">
                            {getHelperText()}
                        </p>
                    </div>

                    <div>
                        <label className="text-gray-400 text-sm mb-2 block">
                            Team Members
                            <span className="text-gray-600 ml-1">(optional)</span>
                        </label>

                        <div className="space-y-2">
                            {members.map((member) => (
                                <div key={member.id} className="flex gap-2">
                                    <label htmlFor={`member-name-${member.id}`} className="sr-only">
                                        Member name
                                    </label>
                                    <input
                                        id={`member-name-${member.id}`}
                                        type="text"
                                        value={member.name}
                                        onChange={(e) => handleMemberChange(member.id, "name", e.target.value)}
                                        placeholder="Member name"
                                        disabled={loading}
                                        className="flex-1 bg-gray-800 text-white px-3 py-2
                                                   rounded-lg outline-none focus:ring-2
                                                   focus:ring-white/20 text-sm disabled:opacity-50"
                                    />
                                    <label htmlFor={`member-role-${member.id}`} className="sr-only">
                                        Member role
                                    </label>
                                    <select
                                        id={`member-role-${member.id}`}
                                        value={member.role}
                                        onChange={(e) => handleMemberChange(member.id, "role", e.target.value)}
                                        disabled={loading}
                                        className="bg-gray-800 text-white px-3 py-2
                                                   rounded-lg outline-none text-sm disabled:opacity-50"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="developer">Developer</option>
                                        <option value="viewer">Viewer</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => removeMember(member.id)}
                                        disabled={loading || members.length === 1}
                                        aria-label="Remove member"
                                        className="text-red-400 px-2 hover:text-red-300
                                                   disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={addMember}
                            disabled={loading}
                            className="text-gray-500 hover:text-white text-sm mt-2
                                       transition disabled:opacity-50"
                        >
                            + Add another member
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white hover:bg-gray-100 text-black
                                   font-semibold py-3 rounded-lg transition
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating team..." : "Create Team →"}
                    </button>

                </form>
            </div>
        </div>
    );
}

export default TeamSetup;