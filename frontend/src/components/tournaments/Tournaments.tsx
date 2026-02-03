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
	end_date?: string | null;
	tournament_description?: string | null;
	winner_id?: string | null;
};

type PlayerRow = {
	id: string;
	player_name: string;
};

type Filter = "all" | "upcoming" | "in_progress" | "completed";

export default function Tournaments() {
	const [tournaments, setTournaments] = useState<Tournament[]>([]);
	const [playersData, setPlayersData] = useState<PlayerRow[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<Filter>("all");

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [tournamentsRes, playersRes] = await Promise.all([
					supabase
						.from("tournaments")
						.select("*")
						.order("created_at", { ascending: false }),
					supabase.from("players").select("id, player_name"),
				]);

				if (tournamentsRes.error) throw tournamentsRes.error;
				if (playersRes.error) throw playersRes.error;

				if (tournamentsRes.data) setTournaments(tournamentsRes.data);
				if (playersRes.data) setPlayersData(playersRes.data);
			} catch (err: unknown) {
				if (err instanceof Error) setError(err.message);
				else setError("Failed to fetch tournaments");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	const playersMap = useMemo(
		() => new Map(playersData.map((p) => [p.id, p])),
		[playersData]
	);

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

		// Sort by start_date descending
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
				{/* Left group: Create Tournament + All */}
				<div className="flex flex-wrap justify-center gap-2">
					<Link href="/tournaments/create">
						<button className="px-4 py-2 rounded-lg">
							Create Tournament
						</button>
					</Link>

					<Link href="/documentation/tournaments">
						<button className="px-4 py-2 rounded-lg">Guide</button>
					</Link>

					<button
						onClick={() => setFilter("all")}
						className={`px-4 py-2 rounded-lg ${
							filter === "all" ? "font-semibold underline" : ""
						}`}
					>
						All
					</button>
				</div>

				{/* Right group: Upcoming / In Progress / Completed */}
				<div className="flex flex-wrap justify-center gap-2">
					{["upcoming", "in_progress", "completed"].map((value) => {
						const labels: Record<string, string> = {
							upcoming: "Upcoming",
							in_progress: "In Progress",
							completed: "Completed",
						};
						return (
							<button
								key={value}
								onClick={() => setFilter(value as Filter)}
								className={`px-4 py-2 rounded-lg ${
									filter === value
										? "font-semibold underline"
										: ""
								}`}
							>
								{labels[value]}
							</button>
						);
					})}
				</div>
			</div>

			{/* TOURNAMENT CARDS */}
			<section className="space-y-3">
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

					const winner =
						t.completed && t.winner_id
							? playersMap.get(t.winner_id)
							: null;

					return (
						<div
							key={t.id}
							onClick={() =>
								(window.location.href = `/tournaments/${t.id}`)
							}
							className="bg-card p-6 rounded-xl hover-card cursor-pointer transition"
						>
							<div className="flex justify-between gap-6">
								{/* Left column: Name, Description, Winner */}
								<div className="flex-1 space-y-2">
									<h2 className="text-lg font-semibold">
										{t.tournament_name}
									</h2>
									<p className="text-text-subtle text-sm">
										{description}
									</p>
									{winner && (
										<p className="text-sm text-text-muted">
											Winner:{" "}
											<Link
												href={`/profile/${winner.player_name}`}
												onClick={(e) =>
													e.stopPropagation()
												}
												className="hover:underline"
											>
												{winner.player_name}
											</Link>
										</p>
									)}
								</div>

								{/* Right column: Status above Start/End Date */}
								<div className="flex flex-col items-end text-sm text-text-muted shrink-0 space-y-1">
									<span>{status}</span>
									<div>
										Start:{" "}
										{t.start_date
											? new Date(
													t.start_date
												).toLocaleDateString()
											: "No date"}
									</div>
									{t.completed && t.end_date && (
										<div>
											End:{" "}
											{new Date(
												t.end_date
											).toLocaleDateString()}
										</div>
									)}
								</div>
							</div>
						</div>
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
