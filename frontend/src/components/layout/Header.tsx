"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

//Header with responsive navigation
export default function Header() {
    const [open, setOpen] = useState(false);

    //Navigation links
    const navLinks = [
        { href: "/leaderboard", label: "Leaderboard" },
        { href: "/submitmatch", label: "Submit Match" },
        { href: "/tournament", label: "Tournaments" },
        { href: "/profile", label: "Profile" },
        { href: "/login", label: "Login" },
    ];

    return (
        <header className="bg-black text-white shadow-md sticky top-0 z-50">
            <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                {/* Logo / Brand */}
                <Link
                    href="/"
                    className="text-2xl font-bold tracking-wide hover:text-gray-300 transition-colors"
                >
                    PingElo
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex gap-6 text-sm font-medium">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="hover:text-gray-300 transition-colors duration-200"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 hover:text-gray-300 transition-colors duration-200"
                    onClick={() => setOpen(!open)}
                    aria-label={open ? "Close menu" : "Open menu"}
                >
                    {open ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Navigation */}
            <nav
                className={`md:hidden bg-black border-t border-white/10 flex flex-col gap-2 px-4 py-3 transition-all duration-200 ${
                open ? "max-h-screen" : "max-h-0 overflow-hidden"}`}
            >
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="py-2 hover:text-gray-300 transition-colors duration-200"
                        onClick={() => setOpen(false)} //Close menu after clicking
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>
        </header>
    );
}