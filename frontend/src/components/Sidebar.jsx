import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
    Menu,
    X,
    Home,
    Users,
    BarChart3,
    MessageCircle,
    Gauge,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 10000;

const NAV_ITEMS = [
    { label: "Home", icon: Home, path: "/dashboard" },
    { label: "Usage by Member", icon: Gauge, path: "/dashboard/usage" },
    { label: "Activity Log", icon: BarChart3, path: "/dashboard/history" },
];

function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const panelRef = useRef(null);
    const menuButtonRef = useRef(null);

    const [isOpen, setIsOpen] = useState(false);
    const [teams, setTeams] = useState([]);
    const [teamsExpanded, setTeamsExpanded] = useState(false);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [teamsError, setTeamsError] = useState("");
    const [hasFetchedTeams, setHasFetchedTeams] = useState(false);

    // Close sidebar automatically on route change (mobile-friendly)
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    // ✅ Invalidate the cached team list every time the sidebar closes,
    // so reopening it always shows current data (e.g. after deleting a
    // team elsewhere in the app) instead of a stale cached list forever.
    useEffect(() => {
        if (!isOpen) {
            setHasFetchedTeams(false);
        }
    }, [isOpen]);

    const fetchTeams = useCallback(async (signal) => {
        setLoadingTeams(true);
        setTeamsError("");
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/team/myTeams`,
                { withCredentials: true, timeout: REQUEST_TIMEOUT_MS, signal }
            );
            setTeams(response.data?.teams ?? []);
            setHasFetchedTeams(true);
        } catch (err) {
            if (axios.isCancel(err) || err.code === "ERR_CANCELED") return;

            if (err.response?.status === 401) {
                navigate("/login", { replace: true });
                return;
            }
            if (err.code === "ECONNABORTED") {
                setTeamsError("Request timed out. Try again.");
            } else {
                setTeamsError("Couldn't load your teams. Try again.");
            }
        } finally {
            setLoadingTeams(false);
        }
    }, [navigate]);

    // Fetch the user's teams once, the first time the section is expanded
    useEffect(() => {
        if (!teamsExpanded || hasFetchedTeams) return;

        const controller = new AbortController();
        fetchTeams(controller.signal);

        return () => controller.abort();
    }, [teamsExpanded, hasFetchedTeams, fetchTeams]);

    function retryFetchTeams() {
        setHasFetchedTeams(false);
    }

    // Body scroll lock + focus trap + Escape-to-close while open
    useEffect(() => {
        if (!isOpen) return;

        const scrollY = window.scrollY;
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = "100%";

        const firstFocusable = panelRef.current?.querySelector(
            'button, a[href], input, select, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();

        function handleKeyDown(e) {
            if (e.key === "Escape") {
                setIsOpen(false);
                return;
            }
            if (e.key === "Tab" && panelRef.current) {
                const focusables = panelRef.current.querySelectorAll(
                    'button, a[href], input, select, [tabindex]:not([tabindex="-1"])'
                );
                if (!focusables.length) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.width = "";
            window.scrollTo(0, scrollY);
            menuButtonRef.current?.focus();
        };
    }, [isOpen]);

    // ✅ Fixed: switching teams while already on /dashboard now actually
    // switches. navigate() alone doesn't remount when the path is unchanged,
    // and Dashboard reads teamId from sessionStorage only once on mount —
    // so we force a full reload to guarantee fresh data for the new team.
    function goToTeam(teamId) {
        if (!teamId) return;
        sessionStorage.setItem("teamId", teamId);
        setIsOpen(false);

        if (location.pathname === "/dashboard") {
            window.location.reload();
        } else {
            navigate("/dashboard");
        }
    }

    return (
        <>
            {/* Menu button — place this in your Navbar */}
            <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Open menu"
                aria-expanded={isOpen}
                className="text-gray-300 hover:text-white transition-colors p-2"
            >
                <Menu size={22} aria-hidden="true" />
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar panel */}
            <aside
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
                className={`fixed top-0 left-0 z-50 h-full w-72 bg-gray-900 border-r border-white/10
                            transform transition-transform duration-300 ease-out
                            ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
                    <span className="text-white font-semibold text-lg">CostShield</span>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close menu"
                        tabIndex={isOpen ? 0 : -1}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <nav className="px-3 py-4 flex flex-col gap-1">
                    {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
                        const isActive =
                            location.pathname === path ||
                            (path !== "/dashboard" && location.pathname.startsWith(path));
                        return (
                            <Link
                                key={label}
                                to={path}
                                tabIndex={isOpen ? 0 : -1}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                                            ${isActive
                                        ? "bg-blue-600/15 text-blue-400"
                                        : "text-gray-300 hover:bg-white/5 hover:text-white"}`}
                            >
                                <Icon size={18} aria-hidden="true" />
                                {label}
                            </Link>
                        );
                    })}

                    {/* Teams section */}
                    <button
                        type="button"
                        onClick={() => setTeamsExpanded((prev) => !prev)}
                        tabIndex={isOpen ? 0 : -1}
                        aria-expanded={teamsExpanded}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                                   text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <Users size={18} aria-hidden="true" />
                        Total Teams
                        <span className="ml-auto text-xs text-gray-500">
                            {teamsExpanded ? "−" : "+"}
                        </span>
                    </button>

                    {teamsExpanded && (
                        <div className="ml-4 pl-4 border-l border-white/10 flex flex-col gap-1 mt-1">
                            {loadingTeams && (
                                <p className="text-gray-500 text-xs px-3 py-2">Loading teams…</p>
                            )}

                            {!loadingTeams && teamsError && (
                                <div className="px-3 py-2">
                                    <p className="text-red-400 text-xs mb-1">{teamsError}</p>
                                    <button
                                        type="button"
                                        onClick={retryFetchTeams}
                                        tabIndex={isOpen ? 0 : -1}
                                        className="text-blue-400 text-xs hover:underline"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            {!loadingTeams && !teamsError && hasFetchedTeams && teams.length === 0 && (
                                <p className="text-gray-500 text-xs px-3 py-2">
                                    No teams yet.{" "}
                                    <Link
                                        to="/setup"
                                        tabIndex={isOpen ? 0 : -1}
                                        className="text-blue-400 hover:underline"
                                    >
                                        Create one
                                    </Link>
                                </p>
                            )}

                            {!loadingTeams &&
                                !teamsError &&
                                teams.map((team) => {
                                    const teamId = (team._id || team.id)?.toString();
                                    if (!teamId) return null;
                                    return (
                                        <button
                                            key={teamId}
                                            type="button"
                                            onClick={() => goToTeam(teamId)}
                                            tabIndex={isOpen ? 0 : -1}
                                            className="text-left text-sm text-gray-300 hover:text-white
                                                       hover:bg-white/5 px-3 py-2 rounded-lg transition-colors truncate"
                                        >
                                            {team.teamName || team.name}
                                        </button>
                                    );
                                })}
                        </div>
                    )}
                </nav>
            </aside>
        </>
    );
}

export default Sidebar;