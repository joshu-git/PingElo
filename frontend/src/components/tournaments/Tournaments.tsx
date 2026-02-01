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
					.select("*")
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
		switch (filter) {
			case "upcoming":
				return tournaments.filter((t) => !t.started && !t.completed);
			case "in_progress":
				return tournaments.filter((t) => t.started && !t.completed);
			case "completed":
				return tournaments.filter((t) => t.completed);
			default:
				return tournaments;
		}
	}, [tournaments, filter]);

	if (loading) {
		return (
			<div className="max-w-5xl mx-auto px-4 py-16 text-text-muted">
				Loading tournaments…
			</div>
		);
	}

	if (error) {
		return (
			<div className="max-w-5xl mx-auto px-4 py-16 text-red-500">
				Error loading tournaments: {error}
			</div>
		);
	}

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-10">
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
				<div className="flex flex-wrap justify-center gap-2">
					{[
						["all", "All"],
						["upcoming", "Upcoming"],
						["in_progress", "In Progress"],
						["completed", "Completed"],
					].map(([value, label]) => (
						<button
							key={value}
							onClick={() => setFilter(value as Filter)}
							className={`px-4 py-2 rounded-lg ${
								filter === value
									? "font-semibold underline"
									: ""
							}`}
						>
							{label}
						</button>
					))}
				</div>

				<Link href="/tournaments/create">
					<button className="px-4 py-2 rounded-lg">
						Create Tournament
					</button>
				</Link>
			</div>

			{/* TOURNAMENT LIST */}
			<section className="space-y-3">
				{filteredTournaments.length === 0 && (
					<p className="text-center text-text-muted py-8">
						No tournaments found.
					</p>
				)}

				{filteredTournaments.map((t) => {
					const statusLabel = t.completed
						? "Completed"
						: t.started
							? "In Progress"
							: "Upcoming";

					return (
						<Link
							key={t.id}
							href={`/tournaments/${t.id}`}
							className="block bg-card p-4 rounded-xl hover-card"
						>
							<div className="flex justify-between items-center gap-6">
								<div className="space-y-1">
									<h2 className="text-lg font-semibold">
										{t.tournament_name}
									</h2>
									<p className="text-sm text-text-muted">
										{statusLabel}
									</p>
								</div>

								<div className="text-sm text-text-muted text-right shrink-0">
									{t.start_date
										? new Date(
												t.start_date
											).toLocaleDateString()
										: "No date"}
								</div>
							</div>
						</Link>
					);
				})}
			</section>
		</main>
	);
}
