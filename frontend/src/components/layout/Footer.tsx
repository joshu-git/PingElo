"use client";

import Link from "next/link";

//Footer component
export default function Footer() {
  return (
    <footer className="bg-[rgba(46,46,46,0.8)] mt-auto rounded-none">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* Left: Logo */}
        <Link href="/" className="text-2xl font-bold tracking-wide text-white pointer-events-none">
          PingElo
        </Link>

        {/* Right: Meta */}
        <div className="text-right text-sm text-white/70 leading-tight">
          <div>© {new Date().getFullYear()} PingElo</div>
          <div>
            <a
              href="https://github.com/joshu-git/PingElo"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Source
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}