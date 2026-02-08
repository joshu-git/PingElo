"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CreateTournament() {
	const router = useRouter();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [startDate, setStartDate] = useState("");

	const [isAdmin, setIsAdmin] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fieldClass =
		"w-full rounded-lg px-4 py-3 bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-border";

	//Load admin status
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
		setError(null);

		const trimmedName = name.trim();

		if (!trimmedName) {
			setError("Tournament name is required");
		}

		setLoading(true);

		const validNameRegex = /^[A-Za-z0-9 ]+$/;
		if (!validNameRegex.test(trimmedName)) {
			setError("Tournament name can only contain letters and numbers");
			setLoading(false);
			return;
		}

		if (trimmedName.length > 25) {
			setError("Tournament name cannot be longer than 25 characters");
			setLoading(false);
			return;
		}

		const { data: existingTournament, error: checkError } = await supabase
			.from("tournaments")
			.select("id")
			.eq("tournament_name", trimmedName)
			.maybeSingle();

		if (checkError) {
			setError("Failed to check tournament name");
			setLoading(false);
			return;
		}

		if (existingTournament) {
			setError("A tournament with this name already exists");
			setLoading(false);
			return;
		}

		const { data: sessionData } = await supabase.auth.getSession();
		if (!sessionData.session) {
			setLoading(false);
			setError("Not signed in");
			return;
		}

		const res = await fetch(
			`${process.env.NEXT_PUBLIC_BACKEND_URL}/tournaments/create`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${sessionData.session.access_token}`,
				},
				body: JSON.stringify({
					tournament_name: trimmedName,
					tournament_description: description,
					start_date: startDate,
				}),
			}
		);

		if (!res.ok) {
			const { error } = await res.json();
			setLoading(false);
			setError(error || "Failed to create tournament");
			return;
		}

		const tournament = await res.json();

		setLoading(false);

		router.push(`/tournaments/${tournament.id}`);
	}

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HERO */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">
					Create Tournament
				</h1>
				<p className="text-text-muted max-w-2xl mx-auto">
					Create a new tournament for anyone to join.
				</p>
			</section>

			{/* FORM*/}
			<form onSubmit={createTournament} className="w-full space-y-8">
				<input
					className={fieldClass}
					placeholder="Tournament Name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>

				<input
					className={fieldClass}
					placeholder="Description (optional)"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>

				<label className="text-sm text-text-muted font-medium">
					Start Date
				</label>
				<input
					type="date"
					placeholder="Start Date"
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

				{!isAdmin && (
					<p className="text-xs text-center text-text-muted">
						Only admins can create tournaments
					</p>
				)}

				{error && (
					<p className="text-xs text-center text-red-400">{error}</p>
				)}
			</form>
		</main>
	);
}
