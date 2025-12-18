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
        <div className="text-right text-sm text-text-subtle leading-tight">
          <div>© {new Date().getFullYear()} PingElo</div>
          <a
            href="https://github.com/joshu-git/PingElo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-subtle hover:text-text transition-colors"
          >
            Open Source
          </a>
        </div>

      </div>
    </footer>
  );
}