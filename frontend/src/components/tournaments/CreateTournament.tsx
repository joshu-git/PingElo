"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CreateTournament() {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [startDate, setStartDate] = useState("");

	const [isAdmin, setIsAdmin] = useState(false);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// EXACT same fieldClass as SubmitMatch
	const fieldClass =
		"w-full rounded-lg px-4 py-3 bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-border";

	// Load admin status from public.account
	useEffect(() => {
		async function loadAdminStatus() {
			const { data } = await supabase.auth.getSession();
			if (!data.session) return;

			const { data: account } = await supabase
				.from("account")
				.select("is_admin")
				.eq("id", data.session.user.id)
				.single();

			setIsAdmin(Boolean(account?.is_admin));
		}

		loadAdminStatus();
	}, []);

	async function createTournament(e: React.FormEvent) {
		e.preventDefault();
		if (!isAdmin || loading) return;

		setLoading(true);
		setMessage(null);
		setError(null);

		try {
			const { data } = await supabase.auth.getSession();
			if (!data.session) throw new Error("Not signed in");

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/tournaments/create`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${data.session.access_token}`,
					},
					body: JSON.stringify({
						tournament_name: name,
						tournament_description: description,
						start_date: startDate,
						match_type: "singles",
					}),
				}
			);

			if (!res.ok) throw new Error(await res.text());

			setName("");
			setDescription("");
			setStartDate("");
			setMessage("Tournament created successfully");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Something went wrong"
			);
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HERO */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">
					Create Tournament
				</h1>
				<p className="text-text-muted max-w-2xl mx-auto">
					Create a new singles tournament for your group.
				</p>
			</section>

			{/* FORM — FULL WIDTH (matches SubmitMatch) */}
			<form onSubmit={createTournament} className="w-full space-y-8">
				<input
					className={fieldClass}
					placeholder="Tournament name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>

				<textarea
					className={`${fieldClass} min-h-[120px] resize-none`}
					placeholder="Tournament description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>

				<input
					type="date"
					className={fieldClass}
					value={startDate}
					onChange={(e) => setStartDate(e.target.value)}
				/>

				<button
					type="submit"
					disabled={!isAdmin || loading}
					className="w-full px-4 py-3 rounded-lg font-semibold"
				>
					{loading ? "Creating…" : "Create Tournament"}
				</button>

				{/* Admin restriction message */}
				{!isAdmin && (
					<p className="text-xs text-center text-text-muted">
						Only admins can create tournaments
					</p>
				)}

				{message && (
					<p className="text-xs text-center text-green-400">
						{message}
					</p>
				)}

				{error && (
					<p className="text-xs text-center text-red-400">{error}</p>
				)}
			</form>
		</main>
	);
}
