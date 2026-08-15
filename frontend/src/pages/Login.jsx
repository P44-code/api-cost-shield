import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        identifier: "",
        password: "",
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    function handleChange(e) {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (error) setError("");
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (loading) return;

        const trimmedIdentifier = formData.identifier.trim();

        if (!trimmedIdentifier || !formData.password) {
            setError("All fields are required.");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        setError("");

        const isEmail = EMAIL_REGEX.test(trimmedIdentifier);

        const payload = isEmail
            ? { email: trimmedIdentifier, password: formData.password }
            : { username: trimmedIdentifier, password: formData.password };

        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/auth/login`,
                payload,
                { withCredentials: true }
            );

            // ✅ Agar login response mein teamId kisi common shape mein aata
            // hai, use save kar lo — TeamSetup ko extra API call nahi karni
            // padegi. Yeh sirf a "if present" check hai, na milne par bhi
            // aage ka flow tootega nahi (TeamSetup khud check karega).
            const teamId =
                response.data?.teamId ||
                response.data?.team?.id ||
                response.data?.team?._id ||
                response.data?.user?.teamId ||
                null;

            if (teamId) {
                sessionStorage.setItem("teamId", teamId);
            }

            // ✅ Seedha /dashboard nahi — /setup pe bhejo, jo decide karega
            // ki existing team dikhani hai ya "Create Team" form.
            // (Agar user ke paas team hai, TeamSetup khud /dashboard
            // pe le jaayega "Go to Dashboard" button se.)
            navigate("/home", { replace: true });

        } catch (err) {
            if (!err.response) {
                setError("Network error. Either our server is down or you are offline.");
            } else {
                setError(err.response.data?.message || "Invalid credentials.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <style>{`
                input[type="password"]::-ms-reveal,
                input[type="password"]::-ms-clear {
                    display: none;
                }
                input[type="password"]::-webkit-textfield-decoration-container {
                    visibility: hidden;
                }
            `}</style>

            <div className={`bg-gray-900 p-8 rounded-2xl shadow-lg w-full max-w-md transition-opacity duration-200 ${loading ? "opacity-60 pointer-events-none select-none" : ""}`}>

                <h1 className="text-2xl font-bold text-white mb-2">
                    Welcome Back
                </h1>
                <p className="text-gray-400 mb-6 text-sm">
                    API Cost Shield — Budget Manager
                </p>

                {error && (
                    <div
                        className="bg-red-500/10 border border-red-500 text-red-400 
                                    px-4 py-3 rounded-lg mb-4 text-sm"
                        role="alert"
                        aria-live="assertive"
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                    <div>
                        <label htmlFor="login-identifier" className="text-gray-400 text-sm mb-1 block">
                            Username or Email
                        </label>
                        <input
                            id="login-identifier"
                            type="text"
                            name="identifier"
                            value={formData.identifier}
                            onChange={handleChange}
                            placeholder="enter username or email"
                            autoComplete="username"
                            autoFocus
                            className="w-full bg-gray-800 text-white px-4 py-3 
                                       rounded-lg outline-none focus:ring-2 
                                       focus:ring-blue-500 text-sm disabled:opacity-50"
                            disabled={loading}
                            required
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label htmlFor="login-password" className="text-gray-400 text-sm block">
                                Password
                            </label>
                            <Link to="/forgot-password" className="text-blue-400 text-xs hover:underline">
                                Forgot password?
                            </Link>
                        </div>
                        <div className="relative">
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="enter password"
                                autoComplete="current-password"
                                className="w-full bg-gray-800 text-white pl-4 pr-12 py-3 
                                           rounded-lg outline-none focus:ring-2 
                                           focus:ring-blue-500 text-sm disabled:opacity-50"
                                disabled={loading}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                title={showPassword ? "Hide password" : "Show password"}
                                disabled={loading}
                                className="absolute right-4 top-1/2 -translate-y-1/2 
                                           text-gray-400 hover:text-white transition disabled:opacity-50"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 
                                   text-white font-semibold py-3 rounded-lg 
                                   transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                </form>

                <p className="text-gray-500 text-sm text-center mt-6">
                    Don't have an account?{" "}
                    <Link to="/register" className="text-blue-400 hover:underline">
                        Register
                    </Link>
                </p>

            </div>
        </div>
    );
}

export default Login;