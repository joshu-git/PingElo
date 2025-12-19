"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Footer() {
    //Lazy initialization of theme, checks system preference
    const [theme, setTheme] = useState<"light" | "dark">(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("theme");
            if (saved === "light" || saved === "dark") return saved;

            //Detect system preference
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            return prefersDark ? "dark" : "light";
        }

        //Fallback
        return "dark";
    });

    //Sync DOM and localStorage whenever theme changes
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
    };

    return (
        <footer className="bg-card mt-auto rounded-none">
            <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                
                {/* Left: Logo */}
                <Link
                    href="/"
                    className="text-2xl font-bold tracking-wide text-text"
                >
                    PingElo
                </Link>

                {/* Right: Meta + Theme toggle */}
                <div className="flex items-center gap-4">
                    {/* Meta shifted slightly left */}
                    <div className="flex flex-col items-end text-sm leading-tight mr-2">
                        <div className="text-text-subtle">
                            © {new Date().getFullYear()} PingElo
                        </div>
                        <a
                            href="https://github.com/joshu-git/PingElo"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent-hover"
                        >
                            Open Source
                        </a>
                    </div>

                    {/* Theme Toggle to the right of meta */}
                    <button
                        onClick={toggleTheme}
                        className="px-3 py-1 border border-accent rounded-full text-sm text-text-nav bg-bg-card hover:bg-accent-soft transition-colors"
                    >
                        {theme === "light" ? "Light" : "Dark"}
                    </button>
                </div>

            </div>
        </footer>
    );
}