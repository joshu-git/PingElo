"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface Tournament {
	id: string;
	tournament_name: string;
	start_date: string;
	match_type: "singles";
	started: boolean;
	completed: boolean;
}

export default function CreateTournament() {
	const [name, setName] = useState<string>("");
	const [startDate, setStartDate] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function createTournament(): Promise<void> {
		setLoading(true);
		setMessage(null);
		setError(null);

		try {
			// Get user session
			const sessionRes = await supabase.auth.getSession();
			const session = sessionRes.data.session;
			if (!session) throw new Error("You must be signed in");

			const token: string = session.access_token;

			// Create the singles tournament
			const createRes: Response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/tournaments/create`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						tournament_name: name,
						start_date: startDate,
						match_type: "singles",
					}),
				}
			);

			if (!createRes.ok) {
				const errorText: string = await createRes.text();
				throw new Error(errorText || "Failed to create tournament");
			}

			const tournament: Tournament = await createRes.json();

			// Show success message inline
			setName("");
			setStartDate("");
			setMessage(`Tournament created successfully! ID: ${tournament.id}`);
		} catch (err: unknown) {
			if (err instanceof Error) setError(err.message);
			else setError("Something went wrong");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="p-6 max-w-xl mx-auto">
			<h1 className="text-3xl font-bold mb-6">
				Create Singles Tournament
			</h1>

			<div className="space-y-4">
				<input
					className="w-full rounded-lg bg-black/40 border border-white/10 p-3"
					placeholder="Tournament name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>

				<input
					type="date"
					className="w-full rounded-lg bg-black/40 border border-white/10 p-3"
					value={startDate}
					onChange={(e) => setStartDate(e.target.value)}
				/>

				<button
					onClick={createTournament}
					disabled={loading}
					className="w-full rounded-lg bg-white text-black font-semibold py-3 hover:bg-gray-200 transition"
				>
					{loading ? "Creating..." : "Create Tournament"}
				</button>

				{message && (
					<div className="mt-4 p-3 bg-green-500 text-white rounded">
						{message}
					</div>
				)}

				{error && (
					<div className="mt-4 p-3 bg-red-500 text-white rounded">
						{error}
					</div>
				)}
			</div>
		</div>
	);
}
