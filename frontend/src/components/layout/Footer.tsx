"use client";

//Footer component
export default function Footer() {
  return (
    <footer className="bg-[rgba(46,46,46,0.8)] text-text border-t border-text-subtle py-8 mt-auto rounded-none">
      <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between gap-8">

        {/* Left: Logo + tagline */}
        <div className="flex flex-col space-y-2 text-center md:text-left">
          <h2 className="text-2xl font-bold text-text">PingElo</h2>
          <p className="text-text-muted text-sm">
            Track matches, climb the leaderboard, and find out who is the best.
          </p>
        </div>

        {/* Right: Legal + Open Source */}
        <div className="flex flex-col space-y-1 text-center md:text-right text-xs text-text-subtle">
          <p>© {new Date().getFullYear()} PingElo</p>
          <p>
            Built with Vercel, Render, and Supabase
          </p>
          <p>
            <a
              href="https://github.com/joshu-git/PingElo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover"
            >
              Open Source
            </a>
          </p>
          <p>All rights reserved.</p>
        </div>

      </div>
    </footer>
  );
}