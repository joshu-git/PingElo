"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Tournament = {
	id: string;
	tournament_name: string;
	started: boolean;
	completed: boolean;
	start_date: string;
	tournament_description?: string | null;
};

type Filter = "all" | "upcoming" | "in_progress" | "completed";

export default function Tournaments() {
	const [tournaments, setTournaments] = useState<Tournament[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<Filter>("all");

	useEffect(() => {
		async function fetchTournaments(): Promise<void> {
			try {
				const { data, error } = await supabase
					.from("tournaments")
					.select("*") // make sure tournament_description exists in your DB
					.order("created_at", { ascending: false });

				if (error) {
					setError(error.message);
					return;
				}

				if (data) setTournaments(data);
			} catch (err: unknown) {
				if (err instanceof Error) setError(err.message);
				else setError("Failed to fetch tournaments");
			} finally {
				setLoading(false);
			}
		}

		fetchTournaments();
	}, []);

	const filteredTournaments = useMemo(() => {
		let filtered = tournaments;

		switch (filter) {
			case "upcoming":
				filtered = tournaments.filter(
					(t) => !t.started && !t.completed
				);
				break;
			case "in_progress":
				filtered = tournaments.filter((t) => t.started && !t.completed);
				break;
			case "completed":
				filtered = tournaments.filter((t) => t.completed);
				break;
		}

		// Always sort by start_date descending
		return [...filtered].sort((a, b) => {
			const da = a.start_date ? new Date(a.start_date).getTime() : 0;
			const db = b.start_date ? new Date(b.start_date).getTime() : 0;
			return db - da;
		});
	}, [tournaments, filter]);

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HEADER */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">
					Tournaments
				</h1>
				<p className="text-text-muted">
					Singles tournaments and their current status.
				</p>
			</section>

			{/* CONTROLS */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				{/* Create Tournament Button on the LEFT */}
				<Link href="/tournaments/create">
					<button className="px-4 py-2 rounded-lg">
						Create Tournament
					</button>
				</Link>

				{/* Filters on the RIGHT */}
				<div className="flex flex-wrap justify-center gap-2">
					<button
						onClick={() => setFilter("all")}
						className={`px-4 py-2 rounded-lg ${
							filter === "all" ? "font-semibold underline" : ""
						}`}
					>
						All
					</button>
					<button
						onClick={() => setFilter("upcoming")}
						className={`px-4 py-2 rounded-lg ${
							filter === "upcoming"
								? "font-semibold underline"
								: ""
						}`}
					>
						Upcoming
					</button>
					<button
						onClick={() => setFilter("in_progress")}
						className={`px-4 py-2 rounded-lg ${
							filter === "in_progress"
								? "font-semibold underline"
								: ""
						}`}
					>
						In Progress
					</button>
					<button
						onClick={() => setFilter("completed")}
						className={`px-4 py-2 rounded-lg ${
							filter === "completed"
								? "font-semibold underline"
								: ""
						}`}
					>
						Completed
					</button>
				</div>
			</div>

			{/* TOURNAMENT CARDS */}
			<section className="space-y-4">
				{loading && (
					<p className="text-center text-text-muted py-6">
						Loading tournaments…
					</p>
				)}

				{!loading && filteredTournaments.length === 0 && (
					<p className="text-center text-text-muted py-6">
						No tournaments found.
					</p>
				)}

				{filteredTournaments.map((t) => {
					const status = t.completed
						? "Completed"
						: t.started
							? "In Progress"
							: "Upcoming";

					const description =
						t.tournament_description?.trim() || "No Description";

					return (
						<Link
							key={t.id}
							href={`/tournaments/${t.id}`}
							className="block bg-card p-6 rounded-xl hover-card transition"
						>
							<div className="flex flex-col gap-3">
								<h2 className="text-lg font-semibold">
									{t.tournament_name}
								</h2>
								<p className="text-text-subtle text-sm">
									{description}
								</p>
								<div className="flex justify-between items-center text-sm text-text-muted">
									<span>{status}</span>
									<span>
										{t.start_date
											? new Date(
													t.start_date
												).toLocaleDateString()
											: "No date"}
									</span>
								</div>
							</div>
						</Link>
					);
				})}

				{error && (
					<p className="text-center text-red-500 py-4">
						Error loading tournaments: {error}
					</p>
				)}
			</section>
		</main>
	);
}
