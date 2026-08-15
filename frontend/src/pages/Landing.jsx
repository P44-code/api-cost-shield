import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Contact from "../components/Contact";
import Footer from "../components/Footer";

gsap.registerPlugin(ScrollTrigger);



export default function Landing() {
    return (
        <div className="min-h-screen bg-[#05050f] text-white overflow-x-hidden">
            <Navbar />
            <Hero />
            <Features />
            <HowItWorks />
            <Contact />
            <Footer />
        </div>
    );
}

