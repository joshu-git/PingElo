"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Footer() {
    //Lazy initialization: reads localStorage only once
    const [theme, setTheme] = useState<"light" | "dark">(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("theme");
            if (saved === "light" || saved === "dark") return saved;
        }

        //Default
        return "dark";
    });

    //Sync the data-theme attribute with current state
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
                
                {/* Left: Logo + Theme Toggle */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="text-2xl font-bold tracking-wide text-text"
                    >
                        PingElo
                    </Link>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="px-3 py-1 border border-accent rounded-full text-sm text-text-nav bg-bg-card hover:bg-accent-soft transition-colors"
                    >
                        {theme === "light" ? "Dark Mode" : "Light Mode"}
                    </button>
                </div>

                {/* Right: Meta */}
                <div className="flex flex-col items-end text-sm leading-tight">
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
            </div>
        </footer>
    );
}