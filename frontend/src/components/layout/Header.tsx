"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

//Authentication button
function AuthButton({ onClick }: { onClick?: () => void }) {
	const [playerName, setPlayerName] = useState<string | null>(null);
	const [sessionUserId, setSessionUserId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function loadUser() {
			const { data } = await supabase.auth.getSession();
			if (!data.session) {
				setSessionUserId(null);
				setPlayerName(null);
				setLoading(false);
				return;
			}

			const userId = data.session.user.id;
			setSessionUserId(userId);

			const { data: player } = await supabase
				.from("players")
				.select("player_name")
				.eq("account_id", userId)
				.maybeSingle();

			setPlayerName(player?.player_name ?? null);
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
				<button className="px-4 py-2 bg-accent-button text-button-text font-semibold rounded-none">
					Sign In
				</button>
			</Link>
		);

	if (!playerName)
		return (
			<Link href="/account/claim" onClick={onClick}>
				<button className="px-4 py-2 bg-accent-button text-button-text font-semibold rounded-none">
					Claim
				</button>
			</Link>
		);

	return (
		<Link href={`/profile/${playerName}`} onClick={onClick}>
			<button className="px-4 py-2 bg-accent-button text-button-text font-semibold rounded-none">
				Profile
			</button>
		</Link>
	);
}

export default function Header() {
	const [open, setOpen] = useState(false);

	const navLinks = [
		{ href: "/leaderboard", label: "Leaderboard" },
		{ href: "/matches", label: "Matches" },
		{ href: "/tournaments", label: "Tournaments" },
		{ href: "/groups", label: "Groups" },
	];

	return (
		<header className="bg-card shadow-md sticky top-0 z-50 rounded-none">
			<div className="container py-4 flex items-center justify-between gap-3">
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
							className="text-text-nav hover:text-accent-hover"
						>
							{link.label}
						</Link>
					))}
					<AuthButton />
				</nav>

				{/* Mobile Menu Button */}
				<button
					className="md:hidden p-2 text-text-nav"
					onClick={() => setOpen(!open)}
					aria-label={open ? "Close menu" : "Open menu"}
				>
					{open ? <X size={24} /> : <Menu size={24} />}
				</button>
			</div>

			{/* Mobile Navigation */}
			<nav
				className={`md:hidden bg-card-square overflow-hidden ${
					open
						? "max-h-96 py-3 pointer-events-auto"
						: "max-h-0 pointer-events-none"
				}`}
				aria-hidden={!open}
			>
				<div
					className={`flex flex-col gap-2 px-4 ${
						!open ? "hidden" : ""
					}`}
				>
					{navLinks.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className="py-2 text-text-nav hover:text-accent-hover"
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
