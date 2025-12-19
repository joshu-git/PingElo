"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

//Authentication button
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

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
        setTimeout(() => loadUser(), 0);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return null;

  if (!sessionUserId)
    return (
      <Link href="/account/signin" onClick={onClick}>
        <button className="px-4 py-2 bg-accent text-white font-semibold rounded-none">
          Sign In
        </button>
      </Link>
    );

  if (!username)
    return (
      <Link href="/account/claim" onClick={onClick}>
        <button className="px-4 py-2 bg-accent text-white font-semibold rounded-none">
          Claim
        </button>
      </Link>
    );

  return (
    <Link href={`/profile/${username}`} onClick={onClick}>
      <button className="px-4 py-2 bg-accent text-white font-semibold rounded-none">
        Profile
      </button>
    </Link>
  );
}

//Header component
export default function Header() {
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/matches", label: "Matches" },
    { href: "/tournament", label: "Tournaments" },
  ];

  return (
    <header className="bg-[rgba(46,46,46,0.8)] shadow-md sticky top-0 z-50 rounded-none">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-bold tracking-wide text-text"
        >
          PingElo
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-text"
            >
              {link.label}
            </Link>
          ))}
          <AuthButton />
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-text"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <nav
        className={`md:hidden bg-[rgba(46,46,46,0.8)] overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          open ? "max-h-96 py-3" : "max-h-0"
        }`}
      >
        <div className="flex flex-col gap-2 px-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-2 text-text"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <AuthButton onClick={() => setOpen(false)} />
        </div>
      </nav>
    </header>
  );
}