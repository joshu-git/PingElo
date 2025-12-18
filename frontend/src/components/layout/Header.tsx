"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

//Authenticate button
function AuthButton({ onClick }: { onClick?: () => void }) {
  const [username, setUsername] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setSessionUserId(null);
        setUsername(null);
        setLoading(false);
        return;
      }

      const userId = data.session.user.id;
      setSessionUserId(userId);

      const { data: player } = await supabase
        .from("players")
        .select("username")
        .eq("user_id", userId)
        .maybeSingle();

      setUsername(player?.username ?? null);
      setLoading(false);
    }

    loadUser();

    const { data: sub } = supabase.auth.onAuthStateChange(() => loadUser());

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return null;

  if (!sessionUserId) {
    return (
      <Link href="/account/signin" onClick={onClick}>
        <button className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-xl font-semibold transition text-white">
          Sign In
        </button>
      </Link>
    );
  }

  if (!username) {
    return (
      <Link href="/account/claim" onClick={onClick}>
        <button className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-xl font-semibold transition text-white">
          Claim
        </button>
      </Link>
    );
  }

  return (
    <Link href={`/profile/${username}`} onClick={onClick}>
      <button className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-xl font-semibold transition text-white">
        Profile
      </button>
    </Link>
  );
}

//Header with responsive navigation
export default function Header() {
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/matches", label: "Matches" },
    { href: "/tournament", label: "Tournaments" },
  ];

  return (
    <header className="bg-bg-card backdrop-blur-sm text-text sticky top-0 z-50 shadow-md border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="text-2xl font-bold tracking-wide hover:text-accent transition-colors"
        >
          PingElo
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-accent transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
          <AuthButton />
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 hover:text-accent transition-colors duration-200"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <nav
        className={`md:hidden bg-bg-card border-t border-border flex flex-col gap-2 px-4 py-3 transition-all duration-200 overflow-hidden ${
          open ? "max-h-screen" : "max-h-0"
        }`}
      >
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="py-2 hover:text-accent transition-colors duration-200"
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <AuthButton onClick={() => setOpen(false)} />
      </nav>
    </header>
  );
}