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

  if (!sessionUserId)
    return (
      <Link href="/account/signin" onClick={onClick}>
        <button className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg font-semibold transition-colors text-white">
          Sign In
        </button>
      </Link>
    );

  if (!username)
    return (
      <Link href="/account/claim" onClick={onClick}>
        <button className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg font-semibold transition-colors text-white">
          Claim
        </button>
      </Link>
    );

  return (
    <Link href={`/profile/${username}`} onClick={onClick}>
      <button className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg font-semibold transition-colors text-white">
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
    <header className="bg-card shadow-md sticky top-0 z-50 md:rounded-none rounded-b-2xl">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="text-2xl font-bold tracking-wide text-text hover:text-text-subtle transition-colors duration-150"
        >
          PingElo
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-text hover:text-text-subtle transition-colors duration-150"
            >
              {link.label}
            </Link>
          ))}
          <AuthButton />
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-text hover:text-text-subtle transition-colors duration-150"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <nav
        className={`md:hidden bg-card overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          open ? "max-h-96 py-3 rounded-b-2xl" : "max-h-0"
        }`}
      >
        <div className="flex flex-col gap-2 px-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-2 text-text hover:text-text-subtle transition-colors duration-150"
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