import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ShieldCheck, Gauge, Users, Bell, BarChart3, Lock, X } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
    {
        icon: ShieldCheck,
        title: "Hard budget limits",
        description: "Set a token budget per team and CostShield blocks requests the moment it's exhausted — no surprise bills.",
        details: "Define a hard ceiling on token spend for any team or project. Once that ceiling is hit, CostShield automatically blocks further API requests at the gateway level — before the bill ever reaches you. Limits can be set daily, weekly, or monthly, and can be adjusted at any time by an admin without redeploying anything.",
    },
    {
        icon: Gauge,
        title: "Real-time usage tracking",
        description: "Every API call is logged and measured instantly, so you always know exactly where your spend stands.",
        details: "Every request that flows through CostShield is measured and logged the moment it happens — no batch delays, no waiting for a nightly sync. Your dashboard reflects live spend, so you can catch a runaway job or misconfigured script within seconds rather than finding out at the end of the month.",
    },
    {
        icon: Bell,
        title: "Early warning alerts",
        description: "Get notified at 80% budget usage, well before you hit the wall — plenty of time to react.",
        details: "CostShield notifies your team automatically at configurable thresholds — 50%, 80%, 95% of budget, or whatever makes sense for your workflow. Alerts go out via email or webhook, giving you time to investigate a spike before it turns into a hard block or an unexpected charge.",
    },
    {
        icon: Users,
        title: "Per-member visibility",
        description: "See which team members are driving usage, with role-based access so the right people see the right data.",
        details: "Break usage down by individual team member, not just a single org-wide total. Role-based access controls ensure engineers see their own usage while admins get the full picture — so accountability doesn't require everyone having visibility into everyone else's numbers.",
    },
    {
        icon: BarChart3,
        title: "Spend breakdowns",
        description: "Understand where tokens go — by member, by time period, by request — not just a single running total.",
        details: "Slice your spend by member, by day or week, or by individual request type. Instead of a single running total that tells you nothing about *why* costs moved, you get the context needed to actually optimize — which endpoints, teams, or workflows are the biggest drivers.",
    },
    {
        icon: Lock,
        title: "Secure by default",
        description: "Session-based auth, scoped team access, and no client-side storage of anything sensitive.",
        details: "CostShield uses session-based authentication and scoped team access out of the box — no sensitive tokens or credentials are ever stored client-side. Every account is isolated at the team level, so there's no accidental cross-team data leakage as you scale up the number of teams on your workspace.",
    },
];

const CARD_CLASS =
    "bg-gray-900 border border-white/10 rounded-2xl p-6 opacity-0 text-left w-full will-change-transform " +
    "transition-[transform,border-color,background-color] duration-300 hover:border-blue-500/40 hover:bg-gray-900/80 hover:-translate-y-1 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500";

const ICON_BOX_CLASS =
    "w-10 h-10 rounded-lg bg-blue-600/15 flex items-center justify-center mb-4 " +
    "transition-colors duration-300 group-hover:bg-blue-600/25";

function Features() {
    const sectionRef = useRef(null);
    const headingRef = useRef(null);
    const cardsRef = useRef(null);
    const closeButtonRef = useRef(null);
    const lastFocusedRef = useRef(null);

    const [activeFeature, setActiveFeature] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const reduceMotion = useRef(
        typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    );

    useEffect(() => {
        if (reduceMotion.current) {
            gsap.set([headingRef.current, cardsRef.current?.children], { opacity: 1 });
            return;
        }

        const ctx = gsap.context(() => {
            gsap.fromTo(
                headingRef.current,
                { opacity: 0, y: 20 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top 75%",
                        once: true,
                    },
                }
            );

            if (cardsRef.current?.children?.length) {
                gsap.fromTo(
                    cardsRef.current.children,
                    { opacity: 0, y: 15 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.5,
                        stagger: 0.1,
                        ease: "power2.out",
                        scrollTrigger: {
                            trigger: cardsRef.current,
                            start: "top 80%",
                            once: true,
                        },
                    }
                );
            }
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    // Open modal: remember what was focused, show it, then move focus in
    function openFeature(feature) {
        lastFocusedRef.current = document.activeElement;
        setActiveFeature(feature);
        setModalVisible(true);
    }

    // Close modal: fade out first, then unmount + restore focus
    function closeFeature() {
        setModalVisible(false);
        window.setTimeout(() => {
            setActiveFeature(null);
            lastFocusedRef.current?.focus?.();
        }, 200);
    }

    // Focus the close button once modal mounts, lock body scroll, handle Escape + Tab trap
    useEffect(() => {
        if (!activeFeature) return;

        const scrollY = window.scrollY;
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = "100%";

        closeButtonRef.current?.focus();

        function handleKeyDown(e) {
            if (e.key === "Escape") {
                closeFeature();
                return;
            }
            if (e.key === "Tab") {
                const focusables = document.querySelectorAll(
                    '[data-feature-modal] button, [data-feature-modal] a'
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
        };
    }, [activeFeature]);

    return (
        <section
            ref={sectionRef}
            id="features"
            className="relative px-6 py-24 max-w-6xl mx-auto scroll-mt-24"
        >
            <div className="text-center max-w-2xl mx-auto mb-14">
                <h2
                    ref={headingRef}
                    className="text-3xl md:text-4xl font-bold text-white tracking-tight opacity-0"
                >
                    Everything you need to control API spend
                </h2>
                <p className="mt-4 text-gray-400 text-base">
                    Built for teams shipping AI features — not just a dashboard, an active safeguard.
                </p>
            </div>

            <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {FEATURES.map((feature) => {
                    const { icon: Icon, title, description } = feature;
                    return (
                        <button
                            key={title}
                            type="button"
                            onClick={() => openFeature(feature)}
                            className={`group ${CARD_CLASS}`}
                        >
                            <div className={ICON_BOX_CLASS}>
                                <Icon size={20} className="text-blue-400" aria-hidden="true" />
                            </div>
                            <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
                        </button>
                    );
                })}
            </div>

            {/* Feature detail modal */}
            {activeFeature && (
                <div
                    data-feature-modal
                    className={`fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/70 backdrop-blur-sm
                                transition-opacity duration-200 ${modalVisible ? "opacity-100" : "opacity-0"}`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="feature-modal-title"
                    aria-describedby="feature-modal-description"
                    onClick={closeFeature}
                >
                    <div
                        className={`relative bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-lg w-full
                                    transition-all duration-200 ${modalVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            ref={closeButtonRef}
                            type="button"
                            onClick={closeFeature}
                            aria-label="Close"
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} aria-hidden="true" />
                        </button>

                        <div className="w-12 h-12 rounded-lg bg-blue-600/15 flex items-center justify-center mb-5">
                            <activeFeature.icon size={22} className="text-blue-400" aria-hidden="true" />
                        </div>

                        <h3 id="feature-modal-title" className="text-white font-semibold text-xl mb-3">
                            {activeFeature.title}
                        </h3>
                        <p id="feature-modal-description" className="text-gray-400 text-sm leading-relaxed">
                            {activeFeature.details}
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Features;