import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";

const NAV_LINKS = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Contact", href: "#contact" },
];

const SCROLL_THRESHOLD = 20;
const DESKTOP_BREAKPOINT_PX = 768;
const MOBILE_MENU_ID = "mobile-nav-menu";
const LINK_CLASS = "text-sm text-gray-400 hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/5";
const CTA_CLASS = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition";

function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const navRef = useRef(null);
    const logoRef = useRef(null);
    const linksRef = useRef(null);
    const btnsRef = useRef(null);
    const mobileRef = useRef(null);
    const menuButtonRef = useRef(null);
    const hasOpenedOnce = useRef(false);

    const reduceMotion = useRef(
        typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    );

    // Entrance animation + scroll state
    useEffect(() => {
        if (reduceMotion.current) {
            gsap.set([navRef.current, logoRef.current, btnsRef.current, linksRef.current?.children], { opacity: 1 });
        } else {
            gsap.timeline({ delay: 0.2 })
                .fromTo(navRef.current, { y: -100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" })
                .fromTo(logoRef.current, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, "-=0.3")
                .fromTo(linksRef.current?.children || [], { opacity: 0, y: -15 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: "power2.out" }, "-=0.3")
                .fromTo(btnsRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, "-=0.3");
        }

        const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Mobile menu animation
    useEffect(() => {
        if (!mobileRef.current || !menuOpen) return;
        hasOpenedOnce.current = true;

        if (reduceMotion.current) {
            gsap.set(mobileRef.current, { opacity: 1, height: "auto" });
        } else {
            gsap.fromTo(mobileRef.current, { opacity: 0, y: -20, height: 0 }, { opacity: 1, y: 0, height: "auto", duration: 0.4, ease: "power3.out" });
            gsap.fromTo(".mobile-link", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.08, ease: "power2.out", delay: 0.1 });
        }
    }, [menuOpen]);

    useEffect(() => {
        if (!hasOpenedOnce.current || menuOpen || !mobileRef.current) return;
        if (reduceMotion.current) {
            gsap.set(mobileRef.current, { opacity: 0, height: 0 });
        } else {
            gsap.to(mobileRef.current, { opacity: 0, y: -10, height: 0, duration: 0.3, ease: "power2.in" });
        }
    }, [menuOpen]);

    const closeMenu = useCallback(() => setMenuOpen(false), []);

    // Close on Escape, outside click, or desktop resize
    useEffect(() => {
        if (!menuOpen) return;

        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                closeMenu();
                menuButtonRef.current?.focus();
            }
        };
        const onClickOutside = (e) => {
            if (!mobileRef.current?.contains(e.target) && !menuButtonRef.current?.contains(e.target)) closeMenu();
        };
        const onResize = () => {
            if (window.innerWidth >= DESKTOP_BREAKPOINT_PX) closeMenu();
        };

        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("mousedown", onClickOutside);
        window.addEventListener("resize", onResize);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("mousedown", onClickOutside);
            window.removeEventListener("resize", onResize);
        };
    }, [menuOpen, closeMenu]);

    return (
        <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 opacity-0" aria-label="Main navigation">
            <div className={`mx-4 mt-4 rounded-2xl transition-all duration-500 ${scrolled ? "bg-gray-900/60 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50" : "bg-transparent border border-transparent"}`}>
                <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
                    <div ref={logoRef} className="flex items-center gap-3 opacity-0">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-xl bg-blue-600 blur-md opacity-50" aria-hidden="true" />
                            <div className="relative w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
                                <span className="text-white text-base" aria-hidden="true">⚡</span>
                            </div>
                        </div>
                        <div>
                            <span className="text-white font-bold text-lg tracking-tight">Cost</span>
                            <span className="text-blue-400 font-bold text-lg">Shield</span>
                        </div>
                    </div>

                    <div ref={linksRef} className="hidden md:flex items-center gap-1">
                        {NAV_LINKS.map((link) => (
                            <a key={link.href} href={link.href} className={`relative px-4 py-2 group ${LINK_CLASS}`}>
                                {link.label}
                                <span className="absolute bottom-1 left-4 right-4 h-px bg-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" aria-hidden="true" />
                            </a>
                        ))}
                    </div>

                    <div ref={btnsRef} className="hidden md:flex items-center gap-3 opacity-0">
                        <Link to="/login" className={`px-4 py-2 ${LINK_CLASS}`}>Login</Link>
                        <Link to="/register" className={`px-5 py-2.5 ${CTA_CLASS}`}>Get started →</Link>
                    </div>

                    <button
                        ref={menuButtonRef}
                        type="button"
                        onClick={() => setMenuOpen((prev) => !prev)}
                        className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors duration-200"
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={menuOpen}
                        aria-controls={MOBILE_MENU_ID}
                    >
                        <div className="w-5 flex flex-col gap-1.5">
                            <span className={`block h-0.5 bg-gray-400 rounded transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-2" : "w-full"}`} />
                            <span className={`block h-0.5 bg-gray-400 rounded transition-all duration-300 ${menuOpen ? "opacity-0 w-0" : "w-4"}`} />
                            <span className={`block h-0.5 bg-gray-400 rounded transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-2 w-full" : "w-3"}`} />
                        </div>
                    </button>
                </div>
            </div>

            <div id={MOBILE_MENU_ID} ref={mobileRef} className="md:hidden overflow-hidden h-0 opacity-0 mx-4 mt-2 rounded-2xl bg-gray-900/60 backdrop-blur-2xl border border-white/10">
                <div className="px-6 py-4 flex flex-col gap-2">
                    {NAV_LINKS.map((link) => (
                        <a key={link.href} href={link.href} onClick={closeMenu} className={`mobile-link py-2.5 px-3 ${LINK_CLASS}`}>
                            {link.label}
                        </a>
                    ))}
                    <div className="border-t border-white/10 pt-3 mt-1 flex flex-col gap-2">
                        <Link to="/login" onClick={closeMenu} className={`mobile-link py-2.5 px-3 ${LINK_CLASS}`}>Login</Link>
                        <Link to="/register" onClick={closeMenu} className={`mobile-link py-2.5 text-center ${CTA_CLASS}`}>Get started →</Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;