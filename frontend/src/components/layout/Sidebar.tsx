"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Home, BarChart3, Gamepad2, Trophy, Users, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

function AuthButton() {
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
				.from("pe_players")
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
			<Link href="/account/signin" className="w-full">
				<button className="w-full px-4 py-2 bg-accent-button text-button-text font-semibold rounded-lg hover:bg-accent-button-hover transition-colors">
					Sign In
				</button>
			</Link>
		);

	if (!playerName)
		return (
			<Link href="/account/claim" className="w-full">
				<button className="w-full px-4 py-2 bg-accent-button text-button-text font-semibold rounded-lg hover:bg-accent-button-hover transition-colors">
					Claim
				</button>
			</Link>
		);

	return (
		<Link href={`/profile/${playerName}`} className="w-full">
			<button className="w-full px-4 py-2 bg-accent-button text-button-text font-semibold rounded-lg hover:bg-accent-button-hover transition-colors">
				Profile
			</button>
		</Link>
	);
}

export default function Sidebar() {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();

	const navLinks = [
		{ href: "/", label: "Home", icon: Home },
		{ href: "/leaderboard", label: "Leaderboard", icon: BarChart3 },
		{ href: "/matches/submit", label: "Submit Match", icon: Gamepad2 },
		{ href: "/tournaments", label: "Tournaments", icon: Trophy },
		{ href: "/groups", label: "Groups", icon: Users },
		{ href: "/contact", label: "Contact", icon: Mail },
	];

	const isActive = (href: string) => {
		if (href === "/") {
			return pathname === "/";
		}
		return pathname.startsWith(href);
	};

	return (
		<>
			{/* Mobile menu button - fixed */}
			<button
				className="md:hidden fixed top-4 left-4 z-50 p-2 text-text-nav bg-card rounded-lg hover:bg-bg-muted transition-colors"
				onClick={() => setOpen(!open)}
				aria-label={open ? "Close menu" : "Open menu"}
			>
				{open ? <X size={24} /> : <Menu size={24} />}
			</button>

			{/* Backdrop for mobile */}
			{open && (
				<div
					className="md:hidden fixed inset-0 bg-black/50 z-30"
					onClick={() => setOpen(false)}
				/>
			)}

			{/* Sidebar */}
			<aside
				className={`
				fixed left-0 top-0 h-screen w-64 bg-card shadow-lg z-40 flex flex-col
				transition-transform duration-300 ease-in-out
				md:translate-x-0 md:shadow-lg
				${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
			`}
			>
				{/* Logo section */}
				<div className="p-6 border-b border-border">
					<Link
						href="/"
						className="text-2xl font-bold tracking-wide text-text"
						onClick={() => setOpen(false)}
					>
						PingElo
					</Link>
				</div>

				{/* Navigation links */}
				<nav className="flex-1 overflow-y-auto px-4 py-6">
					<div className="space-y-2">
						{navLinks.map((link) => {
							const Icon = link.icon;
							const active = isActive(link.href);

							return (
								<Link
									key={link.href}
									href={link.href}
									onClick={() => setOpen(false)}
									className={`
										flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all
										${
											active
												? "bg-accent-button text-button-text"
												: "text-text-nav hover:bg-bg-muted"
										}
									`}
								>
									<Icon size={20} />
									<span>{link.label}</span>
								</Link>
							);
						})}
					</div>
				</nav>

				{/* Auth button section */}
				<div className="p-4 border-t border-border">
					<AuthButton />
				</div>
			</aside>

			{/* Main content offset */}
			<div className="md:ml-64" />
		</>
	);
}
