"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase"

//Authenticate button
function AuthButton({ onClick }: { onClick?: () => void; }) {
    const [username, setUsername] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    //Load the session data and player
    useEffect(() => {
        async function loadUser() {
            const { data } = await supabase.auth.getSession();
        
            //If their is no data for the session then return
            if (!data.session) {
                setUsername(null);
                setLoading(false);
                return;
            }

            //Fetch the player id
            const { data: player } = await supabase
                .from("players")
                .select("username")
                .eq("user_id", data.session.user.id)
                .single();

            setUsername(player?.username ?? null);
            setLoading(false);
        }

        loadUser();

        //When the auth state changes rerun the function
        const { data: sub } = supabase.auth.onAuthStateChange(() => {
            loadUser();
        });

        //Stop listening
        return () => {
            sub.subscription.unsubscribe();
        };
    }, []);

    //If still loading then return
    if (loading) return null;

    //If no username prompt them to sign in
    if (!username) {
        return (
            <Link
                href="/signin"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition text-white"
                onClick={onClick}
            >
                Sign In
            </Link>
        );
    }

    //Else give them a link to their profile
    return (
        <Link
            href={`/profile/${username}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition text-white"
            onClick={onClick}
        >
            Profile
        </Link>
    );
}

//Header with responsive navigation
export default function Header() {
    const [open, setOpen] = useState(false);
    
    //Static navigation links
    const navLinks = [
        { href: "/leaderboard", label: "Leaderboard" },
        { href: "/matches/submit", label: "Submit Match" },
        { href: "/tournament", label: "Tournaments" },
    ];

    return (
        <header className="bg-black text-white shadow-md sticky top-0 z-50">
            <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                {/* Logo / Brand */}
                <Link
                    href="/"
                    className="text-2xl font-bold tracking-wide hover:text-gray-300 transition-colors"
                >
                    PingElo
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex gap-6 text-sm font-medium">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="hover:text-gray-300 transition-colors duration-200"
                        >
                            {link.label}
                        </Link>
                    ))}

                    <AuthButton />
                </nav>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 hover:text-gray-300 transition-colors duration-200"
                    onClick={() => setOpen(!open)}
                    aria-label={open ? "Close menu" : "Open menu"}
                >
                    {open ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Navigation */}
            <nav
                className={`md:hidden bg-black border-t border-white/10 flex flex-col gap-2 px-4 py-3 transition-all duration-200 ${
                open ? "max-h-screen" : "max-h-0 overflow-hidden"}`}
            >
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="py-2 hover:text-gray-300 transition-colors duration-200"
                        onClick={() => setOpen(false)} //Close menu after clicking
                    >
                        {link.label}
                    </Link>
                ))}
                
                <AuthButton onClick={() => setOpen(false)} />
            </nav>
        </header>
    );
}