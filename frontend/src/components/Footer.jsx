import { Mail } from "lucide-react";
import { FaGithub, FaTwitter, FaLinkedin } from "react-icons/fa";

const currentYear = new Date().getFullYear();

const FOOTER_LINKS = [
    {
        heading: "Product",
        links: [
            { label: "Features", href: "#features" },
            { label: "Pricing", href: "#pricing" },
            { label: "FAQ", href: "#faq" },
        ],
    },
    {
        heading: "Company",
        links: [
            { label: "About", href: "#about" },
            { label: "Contact", href: "#contact" },
        ],
    },
    {
        heading: "Legal",
        links: [
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
        ],
    },
];

const SOCIAL_LINKS = [
    { label: "Email", href: "mailto:support@costshield.dev", Icon: Mail },
    { label: "GitHub", href: "https://github.com/costshield", Icon: FaGithub },
    { label: "Twitter", href: "https://twitter.com/costshield", Icon: FaTwitter },
    { label: "LinkedIn", href: "https://linkedin.com/company/costshield", Icon: FaLinkedin },
];

function Footer() {
    return (
        <footer className="relative border-t border-gray-800 bg-gray-950 px-6 py-16">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
                    {/* Brand */}
                    <div className="md:col-span-2 flex flex-col gap-4">
                        <span className="text-white text-lg font-semibold">CostShield</span>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                            Keeping your cloud spend predictable, one alert at a time.
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                                <a
                                    key={label}
                                    href={href}
                                    target={href.startsWith("http") ? "_blank" : undefined}
                                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                                    aria-label={label}
                                    className="text-gray-400 hover:text-blue-400 transition-colors"
                                >
                                    <Icon size={18} aria-hidden="true" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-8">
                        {FOOTER_LINKS.map(({ heading, links }) => (
                            <div key={heading} className="flex flex-col gap-3">
                                <p className="text-white text-sm font-medium">{heading}</p>
                                <ul className="flex flex-col gap-2">
                                    {links.map(({ label, href }) => (
                                        <li key={label}>
                                            <a
                                                href={href}
                                                className="text-gray-400 text-sm hover:text-blue-400 transition-colors"
                                            >
                                                {label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-gray-500 text-xs">
                        © {currentYear} CostShield. All rights reserved.
                    </p>
                    <p className="text-gray-500 text-xs">
                        Built with care for teams who hate surprise bills.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;