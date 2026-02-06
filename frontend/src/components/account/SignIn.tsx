"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignIn() {
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const fieldClass =
		"w-full rounded-lg px-4 py-3 bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-border";

	async function signIn(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);

		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			setLoading(false);
			alert(error.message);
			return;
		}

		const userId = data.user.id;

		const { data: player } = await supabase
			.from("players")
			.select("player_name")
			.eq("account_id", userId)
			.maybeSingle();

		setLoading(false);

		if (player && player.player_name) {
			router.push(`/profile/${player.player_name}`);
		} else {
			router.push("/account/claim");
		}
	}

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HERO */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">Sign in</h1>
				<p className="text-text-muted max-w-2xl mx-auto">
					Continue competing in tournaments and groups for elo.
				</p>
			</section>

			{/* FORM */}
			<form onSubmit={signIn} className="w-full space-y-8">
				<input
					type="email"
					placeholder="Email address"
					autoComplete="email"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className={fieldClass}
				/>

				<input
					type="password"
					placeholder="Password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className={fieldClass}
				/>

				<button
					type="submit"
					disabled={loading}
					className="w-full px-4 py-3 rounded-lg font-semibold"
				>
					{loading ? "Signing in…" : "Sign In"}
				</button>

				<div className="text-center space-y-2">
					<Link
						href="/account/recover"
						className="text-sm text-text-muted hover:underline"
					>
						Forgot your password?
					</Link>

					<p className="text-sm text-text-muted">
						New here?{" "}
						<Link
							href="/account/signup"
							className="hover:underline"
						>
							Create an account
						</Link>
					</p>
				</div>
			</form>
		</main>
	);
}
