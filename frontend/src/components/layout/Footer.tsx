"use client";

import Link from "next/link";

//Footer component
export default function Footer() {
  return (
    <footer className="bg-[rgba(46,46,46,0.8)] mt-auto rounded-none">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* Left: Logo */}
        <Link
          href="/"
          className="text-2xl font-bold tracking-wide text-white pointer-events-auto select-none"
        >
          PingElo
        </Link>

        {/* Right: Meta */}
        <div className="flex flex-col items-end text-sm text-text-subtle leading-tight select-none gap-0.5">
          <div>© {new Date().getFullYear()} PingElo</div>
          <a
            href="https://github.com/joshu-git/PingElo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover pointer-events-auto"
          >
            Open Source
          </a>
        </div>

      </div>
    </footer>
  );
}