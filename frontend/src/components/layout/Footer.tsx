"use client";

import Link from "next/link";

//Footer component
export default function Footer() {
  return (
    <footer className="bg-[rgba(46,46,46,0.8)] mt-auto rounded-none">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">

        {/* Left: Logo (forced white, no hover) */}
        <Link
          href="/"
          className="text-white hover:text-white"
        >
          <span className="text-2xl font-bold tracking-wide">
            PingElo
          </span>
        </Link>

        {/* Right: Meta (no interaction) */}
        <div className="text-right text-sm text-text-subtle leading-tight">
          <div>© {new Date().getFullYear()} PingElo</div>
          <a
            href="https://github.com/joshu-git/PingElo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-subtle hover:text-text-subtle"
          >
            Open Source
          </a>
        </div>

      </div>
    </footer>
  );
}