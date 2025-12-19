"use client";

import Link from "next/link";

//Footer component
export default function Footer() {
  return (
    <footer className="bg-[rgba(46,46,46,0.8)] mt-auto rounded-none select-text">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">

        {/* Left: Logo */}
        <Link
          href="/"
          className="text-2xl font-bold tracking-wide text-white hover:underline"
        >
          PingElo
        </Link>

        {/* Right: Meta */}
        <div className="flex flex-col items-end text-sm leading-tight">
          <div className="text-text-subtle select-none">
            © {new Date().getFullYear()} PingElo
          </div>
          <a
            href="https://github.com/joshu-git/PingElo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 underline"
          >
            Open Source
          </a>
        </div>

      </div>
    </footer>
  );
}