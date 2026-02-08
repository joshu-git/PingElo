"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUp() {
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [playerName, setPlayerName] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fieldClass =
		"w-full rounded-lg px-4 py-3 bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-border";

	async function signUp(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		const trimmedName = playerName.trim();
		if (!trimmedName) {
			setError("Player name is required");
			return;
		}

		setLoading(true);

		const validNameRegex = /^[A-Za-z0-9]+$/;
		if (!validNameRegex.test(trimmedName)) {
			setError(
				"Player name can only contain letters and numbers (no spaces)"
			);
			setLoading(false);
			return;
		}

		if (trimmedName.length > 10) {
			setError("Player name cannot be longer than 10 characters");
			setLoading(false);
			return;
		}

		const { data: existingPlayer, error: checkError } = await supabase
			.from("players")
			.select("id")
			.eq("player_name", trimmedName)
			.maybeSingle();

		if (checkError) {
			setLoading(false);
			setError("Failed to check player name");
			return;
		}

		if (existingPlayer) {
			setLoading(false);
			setError("A player with this name already exists");
			return;
		}

		//Create account
		const { error: signUpError } = await supabase.auth.signUp({
			email,
			password,
		});

		if (signUpError) {
			setLoading(false);
			setError(signUpError.message);
			return;
		}

		//Get session
		const { data: sessionData } = await supabase.auth.getSession();
		if (!sessionData.session) {
			setLoading(false);
			setError("Failed to create session");
			return;
		}

		//Create player
		const res = await fetch(
			`${process.env.NEXT_PUBLIC_BACKEND_URL}/players/create`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${sessionData.session.access_token}`,
				},
				body: JSON.stringify({
					player_name: trimmedName,
				}),
			}
		);

		if (!res.ok) {
			const { error } = await res.json();
			setLoading(false);
			setError(error || "Failed to create player");
			return;
		}

		setLoading(false);

		router.push(`/profile/${trimmedName}`);
	}

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HERO */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">Sign up</h1>
				<p className="text-text-muted max-w-2xl mx-auto">
					Create an account to start competing.
				</p>
			</section>

			{/* FORM */}
			<form onSubmit={signUp} className="w-full space-y-8">
				<input
					type="email"
					placeholder="Email Address"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className={fieldClass}
				/>

				<input
					type="password"
					placeholder="Password"
					required
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className={fieldClass}
				/>

				<input
					type="text"
					placeholder="Player Name"
					required
					value={playerName}
					onChange={(e) => setPlayerName(e.target.value)}
					className={fieldClass}
				/>

				<button
					type="submit"
					disabled={loading}
					className="w-full px-4 py-3 rounded-lg font-semibold"
				>
					{loading ? "Signing up…" : "Sign Up"}
				</button>

				{error && (
					<p className="text-xs text-center text-red-400">{error}</p>
				)}

				<div className="text-center space-y-2">
					<p className="text-sm text-text-muted">
						Already have an account?
					</p>
					<Link
						href="/account/signin"
						className="text-sm hover:underline"
					>
						Sign in
					</Link>
				</div>
			</form>
		</main>
	);
}
