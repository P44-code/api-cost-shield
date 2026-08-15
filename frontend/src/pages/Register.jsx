import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Register() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    function handleChange(e) {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (loading) return;

        const trimmedUsername = formData.username.trim();
        const trimmedEmail = formData.email.trim();

        if (!trimmedUsername || !trimmedEmail || !formData.password) {
            setError("All fields are required.");
            return;
        }

        if (!EMAIL_REGEX.test(trimmedEmail)) {
            setError("Please enter a valid email address.");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await axios.post(
                `${API_BASE_URL}/api/auth/register`,
                {
                    username: trimmedUsername,
                    email: trimmedEmail,
                    password: formData.password,
                },
                { withCredentials: true }
            );

            navigate("/setup");

        } catch (err) {
            if (!err.response) {
                setError("Network error. Either our server is down or you are offline.");
            } else {
                setError(err.response.data?.message || "Something went wrong.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className={`bg-gray-900 p-8 rounded-2xl shadow-lg w-full max-w-md transition-opacity duration-200 ${loading ? "opacity-60 pointer-events-none select-none" : ""}`}>

                <h1 className="text-2xl font-bold text-white mb-2">
                    Create Account
                </h1>
                <p className="text-gray-400 mb-6 text-sm">
                    API Cost Shield — Budget Manager
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-400 
                                    px-4 py-3 rounded-lg mb-4 text-sm" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">
                            Username
                        </label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="write your name"
                            autoComplete="username"
                            className="w-full bg-gray-800 text-white px-4 py-3 
                                       rounded-lg outline-none focus:ring-2 
                                       focus:ring-blue-500 text-sm disabled:opacity-50"
                            disabled={loading}
                            required
                        />
                    </div>

                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">
                            Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="write your email"
                            autoComplete="email"
                            className="w-full bg-gray-800 text-white px-4 py-3 
                                       rounded-lg outline-none focus:ring-2 
                                       focus:ring-blue-500 text-sm disabled:opacity-50"
                            disabled={loading}
                            required
                        />
                    </div>

                    <div>
                        <label className="text-gray-400 text-sm mb-1 block">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="write your password"
                                autoComplete="new-password"
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
                        {loading ? "Creating account..." : "Register"}
                    </button>

                </form>

                <p className="text-gray-500 text-sm text-center mt-6">
                    Already have an account?{" "}
                    <Link to="/login" className="text-blue-400 hover:underline">
                        Login
                    </Link>
                </p>

            </div>
        </div>
    );
}

export default Register;