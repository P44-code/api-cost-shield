import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ShieldCheck, Zap, TrendingDown } from "lucide-react";

const STATS = [
    { icon: ShieldCheck, label: "Budget limits enforced in real time" },
    { icon: Zap, label: "Blocks overspend before it happens" },
    { icon: TrendingDown, label: "Cut wasted API spend by up to 40%" },
];

function Hero() {
    const headingRef = useRef(null);
    const subRef = useRef(null);
    const ctaRef = useRef(null);
    const statsRef = useRef(null);

    const reduceMotion = useRef(
        typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    );

    useEffect(() => {
        if (reduceMotion.current) {
            gsap.set(
                [headingRef.current, subRef.current, ctaRef.current, statsRef.current?.children],
                { opacity: 1 }
            );
            return;
        }

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ delay: 0.5 });

            tl.fromTo(headingRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" })
                .fromTo(subRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.4")
                .fromTo(ctaRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.35");

            if (statsRef.current?.children?.length) {
                tl.fromTo(
                    statsRef.current.children,
                    { opacity: 0, y: 15 },
                    { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "power2.out" },
                    "-=0.3"
                );
            }
        });

        return () => ctx.revert();
    }, []);

    return (
        <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
            <div
                className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]"
                aria-hidden="true"
            />

            <div className="relative max-w-3xl mx-auto text-center">
                <h1
                    ref={headingRef}
                    className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight opacity-0"
                >
                    Stop AI API bills from{" "}
                    <span className="text-blue-400">blowing your budget</span>
                </h1>

                <p
                    ref={subRef}
                    className="mt-6 text-base md:text-lg text-gray-400 max-w-xl mx-auto opacity-0"
                >
                    CostShield tracks every token your team spends, enforces hard budget limits,
                    and blocks requests before they push you over — no surprise invoices.
                </p>

                <div ref={ctaRef} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0">
                    <Link
                        to="/register"
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold
                                   px-6 py-3 rounded-lg transition text-sm"
                    >
                        Get started →
                    </Link>
                    <a
                        href="#how-it-works"
                        className="w-full sm:w-auto text-gray-300 hover:text-white border border-white/10
                    hover:bg-white/5 font-medium px-6 py-3 rounded-lg transition text-sm text-center"
                    >
                        See how it works
                    </a>
                </div>

                <div
                    ref={statsRef}
                    className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left"
                >
                    {STATS.map(({ icon: Icon, label }) => (
                        <div
                            key={label}
                            className="flex items-center gap-3 bg-white/5 border border-white/10
                                       rounded-xl px-4 py-3 opacity-0"
                        >
                            <Icon size={18} className="text-blue-400 shrink-0" aria-hidden="true" />
                            <span className="text-sm text-gray-300">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section >
    );
}

export default Hero;