import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Mail, MapPin } from "lucide-react";
import { SECTION_HEADING_CLASS } from "../constants/styles";

gsap.registerPlugin(ScrollTrigger);

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Contact() {
    const sectionRef = useRef(null);
    const headingRef = useRef(null);
    const formRef = useRef(null);

    const reduceMotion = useRef(
        typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    );

    const [formData, setFormData] = useState({ name: "", email: "", message: "" });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (reduceMotion.current) {
            gsap.set([headingRef.current, formRef.current], { opacity: 1 });
            return;
        }

        const ctx = gsap.context(() => {
            gsap.fromTo(
                [headingRef.current, formRef.current],
                { opacity: 0, y: 20 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    stagger: 0.15,
                    ease: "power2.out",
                    scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
                }
            );
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    function handleChange(e) {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (loading) return;

        const trimmedName = formData.name.trim();
        const trimmedEmail = formData.email.trim();
        const trimmedMessage = formData.message.trim();

        if (!trimmedName || !trimmedEmail || !trimmedMessage) {
            setError("All fields are required.");
            return;
        }

        if (!EMAIL_REGEX.test(trimmedEmail)) {
            setError("Please enter a valid email address.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess(false);

        try {
            await axios.post(`${API_BASE_URL}/api/contact`, {
                name: trimmedName,
                email: trimmedEmail,
                message: trimmedMessage,
            });

            setSuccess(true);
            setFormData({ name: "", email: "", message: "" });

        } catch (err) {
            if (!err.response) {
                setError("Network error. Either our server is down or you are offline.");
            } else {
                setError(err.response.data?.message || "Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <section
            ref={sectionRef}
            id="contact"
            className="relative px-6 py-32 max-w-4xl mx-auto scroll-mt-24"
        >
            <div className="text-center max-w-2xl mx-auto mb-20">
                <h2 ref={headingRef} className={`${SECTION_HEADING_CLASS} opacity-0`}>
                    Get in touch
                </h2>
                <p className="mt-6 text-gray-400 text-base leading-relaxed">
                    Questions about CostShield? We usually reply within a day.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-[140px]">
                {/* Contact info sidebar */}
                <div className="md:col-span-2 flex flex-col gap-8">
                    <div className="flex items-start gap-4">
                        <Mail size={18} className="text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
                        <div>
                            <p className="text-white text-sm font-medium mb-1">Email</p>
                            <a
                                href="mailto:support@costshield.dev"
                                className="text-gray-400 text-sm hover:text-blue-400 transition-colors"
                            >
                                support@costshield.dev
                            </a>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <MapPin size={18} className="text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
                        <div>
                            <p className="text-white text-sm font-medium mb-1">Based in</p>
                            <p className="text-gray-400 text-sm">Remote-first team</p>
                        </div>
                    </div>
                </div>

                {/* Contact form */}
                <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    noValidate
                    className={`md:col-span-3 bg-gray-900 rounded-2xl p-8 space-y-6 opacity-0
                                transition-opacity duration-200 ${loading ? "opacity-60 pointer-events-none" : ""}`}
                >
                    {error && (
                        <div
                            className="bg-red-500/10 border border-red-500 text-red-400
                                       px-4 py-3 rounded-lg text-sm"
                            role="alert"
                            aria-live="assertive"
                        >
                            {error}
                        </div>
                    )}

                    {success && (
                        <div
                            className="bg-green-500/10 border border-green-500 text-green-400
                                       px-4 py-3 rounded-lg text-sm"
                            role="status"
                            aria-live="polite"
                        >
                            Message sent — we'll get back to you soon.
                        </div>
                    )}

                    <div>
                        <label htmlFor="contact-name" className="text-gray-400 text-sm mb-2 block">
                            Name
                        </label>
                        <input
                            id="contact-name"
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Your name"
                            autoComplete="name"
                            disabled={loading}
                            required
                            className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg outline-none
                                       focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
                        />
                    </div>

                    <div>
                        <label htmlFor="contact-email" className="text-gray-400 text-sm mb-2 block">
                            Email
                        </label>
                        <input
                            id="contact-email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            autoComplete="email"
                            disabled={loading}
                            required
                            className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg outline-none
                                       focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
                        />
                    </div>

                    <div>
                        <label htmlFor="contact-message" className="text-gray-400 text-sm mb-2 block">
                            Message
                        </label>
                        <textarea
                            id="contact-message"
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            placeholder="How can we help?"
                            rows={5}
                            disabled={loading}
                            required
                            className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg outline-none
                                       focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold
                                   py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Sending..." : "Send message"}
                    </button>
                </form>
            </div>
        </section>
    );
}

export default Contact;