"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpLegacy() {
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const fieldClass =
		"w-full rounded-lg px-4 py-3 bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-border";

	async function signUp(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);

		const { error } = await supabase.auth.signUp({
			email,
			password,
		});

		setLoading(false);

		if (error) {
			alert(error.message);
		} else {
			router.push("/account/claim");
		}
	}

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HERO */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">Sign up</h1>
				<p className="text-text-muted max-w-2xl mx-auto">
					Create an account to start competing for elo.
				</p>
			</section>

			{/* FORM */}
			<form onSubmit={signUp} className="w-full space-y-8">
				<input
					type="email"
					placeholder="Email address"
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

				<button
					type="submit"
					disabled={loading}
					className="w-full px-4 py-3 rounded-lg font-semibold"
				>
					{loading ? "Signing up…" : "Sign Up"}
				</button>

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
