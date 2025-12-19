"use client";

import Link from "next/link";

//Footer component
export default function Footer() {
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