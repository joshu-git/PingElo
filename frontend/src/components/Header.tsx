"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Header() {
    const [open, setOpen] = useState(false);

    const navLinks = [
        { href: "/", label: "Home" },
        { href: "/profile", label: "Profile" },
        { href: "/leaderboard", label: "Leaderboard" },
        { href: "/match", label: "Submit Match" },
        { href: "/tournament", label: "Tournaments" },
    ];

    return (
        <header className="bg-black text-white shadow-md">
            <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                <Link href="/" className="text-2xl font-bold tracking-wide hover:text-gray-300">
                    Pingelo
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex gap-6 text-sm font-medium">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="hover:text-gray-300 transition"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 hover:text-gray-300 transition"
                    onClick={() => setOpen(!open)}
                >
                    {open ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Navigation */}
            {open && (
            <nav className="md:hidden bg-black border-t border-white/10 flex flex-col gap-2 px-4 py-3">
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="py-2 hover:text-gray-300 transition"
                        onClick={() => setOpen(false)}
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>
            )}
        </header>
    );
}