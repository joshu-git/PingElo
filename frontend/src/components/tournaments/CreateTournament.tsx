"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface Tournament {
	id: string;
	tournament_name: string;
	tournament_description?: string;
	start_date: string;
	match_type: "singles";
	started: boolean;
	completed: boolean;
}

export default function CreateTournament() {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [startDate, setStartDate] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const fieldClass =
		"w-full rounded-lg px-4 py-3 bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-border";

	async function createTournament() {
		setLoading(true);
		setMessage(null);
		setError(null);

		try {
			const { data } = await supabase.auth.getSession();
			if (!data.session) throw new Error("You must be signed in");

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

			const tournament: Tournament = await res.json();

			setName("");
			setDescription("");
			setStartDate("");
			setMessage(
				`Tournament created successfully (ID: ${tournament.id})`
			);
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
					Set up a new singles tournament and invite players to
					compete.
				</p>
			</section>

			{/* FORM */}
			<div className="max-w-xl mx-auto space-y-6">
				<input
					className={fieldClass}
					placeholder="Tournament name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>

				<textarea
					className={`${fieldClass} min-h-[120px] resize-none`}
					placeholder="Tournament description (optional)"
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
					onClick={createTournament}
					disabled={loading}
					className="w-full px-4 py-3 rounded-lg font-semibold"
				>
					{loading ? "Creating…" : "Create Tournament"}
				</button>

				{message && (
					<p className="text-sm text-center text-green-400">
						{message}
					</p>
				)}

				{error && (
					<p className="text-sm text-center text-red-400">{error}</p>
				)}
			</div>
		</main>
	);
}
