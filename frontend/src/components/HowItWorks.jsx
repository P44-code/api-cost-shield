import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Users, KeyRound, MessageSquare, Gauge } from "lucide-react";
import { SECTION_HEADING_CLASS, CTA_BUTTON_CLASS } from "../constants/styles";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
    {
        icon: Users,
        step: "01",
        title: "Create your team",
        description: "Set up your team, name it, and define a token budget — the hard cap your team won't be able to exceed.",
    },
    {
        icon: KeyRound,
        step: "02",
        title: "Invite your members",
        description: "Add teammates with a role — admin, developer, or viewer — so access matches what each person needs.",
    },
    {
        icon: MessageSquare,
        step: "03",
        title: "Route requests through CostShield",
        description: "Your team chats through our proxy instead of calling the AI API directly. Every request is measured as it happens.",
    },
    {
        icon: Gauge,
        step: "04",
        title: "Track spend and get alerted",
        description: "Watch usage update in real time, get warned at 80% budget, and get hard-blocked before you go over.",
    },
];

function HowItWorks() {
    const sectionRef = useRef(null);
    const headingRef = useRef(null);
    const stepsRef = useRef(null);

    const reduceMotion = useRef(
        typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    );

    useEffect(() => {
        if (reduceMotion.current) {
            gsap.set([headingRef.current, stepsRef.current?.children], { opacity: 1 });
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
                    scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
                }
            );

            if (stepsRef.current?.children?.length) {
                gsap.fromTo(
                    stepsRef.current.children,
                    { opacity: 0, y: 20 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.5,
                        stagger: 0.15,
                        ease: "power2.out",
                        scrollTrigger: { trigger: stepsRef.current, start: "top 80%" },
                    }
                );
            }
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={sectionRef}
            id="how-it-works"
            className="relative px-6 py-24 max-w-4xl mx-auto scroll-mt-24"
        >
            <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 ref={headingRef} className={`${SECTION_HEADING_CLASS} opacity-0`}>
                    How CostShield works
                </h2>
                <p className="mt-4 text-gray-400 text-base">
                    Four steps between you and never getting a surprise API bill again.
                </p>
            </div>

            <ol ref={stepsRef} className="relative list-none">
                {STEPS.map(({ icon: Icon, step, title, description }, index) => (
                    <li key={step} className="relative flex gap-6 pb-12 last:pb-0 opacity-0">
                        {/* Icon circle — connector line is relative to this, not a guessed pixel offset */}
                        <div className="relative shrink-0 w-12 h-12 rounded-full bg-blue-600/15 border border-blue-500/30 flex items-center justify-center">
                            <Icon size={20} className="text-blue-400" aria-hidden="true" />

                            {index < STEPS.length - 1 && (
                                <span
                                    className="absolute top-12 left-1/2 -translate-x-1/2 w-px h-full bg-white/10"
                                    aria-hidden="true"
                                />
                            )}
                        </div>

                        <div className="pt-1">
                            <span className="text-xs font-semibold text-blue-400 tracking-wider uppercase">
                                Step {step}
                            </span>
                            <h3 className="text-white font-semibold text-lg mt-1 mb-2">{title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed max-w-md">{description}</p>
                        </div>
                    </li>
                ))}
            </ol>

            <div className="text-center mt-8">
                <Link to="/register" className={`inline-block px-6 py-3 ${CTA_BUTTON_CLASS}`}>
                    Get started →
                </Link>
            </div>
        </section>
    );
}

export default HowItWorks;