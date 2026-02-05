"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
	winner?: string | null;
	created_at: string;
};

type PlayerRow = {
	id: string;
	player_name: string;
};

type Filter = "all" | "upcoming" | "in_progress" | "completed";

const PAGE_SIZE = 50;

export default function Tournaments() {
	const [tournaments, setTournaments] = useState<Tournament[]>([]);
	const [playersData, setPlayersData] = useState<PlayerRow[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<Filter>("all");
	const [hasMore, setHasMore] = useState(true);

	const cursorRef = useRef<string | null>(null);
	const fetchingRef = useRef(false);

	/* ------------------------------
	   LOAD PLAYERS (ONCE)
	------------------------------ */
	useEffect(() => {
		const loadPlayers = async () => {
			const { data, error } = await supabase
				.from("players")
				.select("id, player_name");

			if (error) {
				setError(error.message);
				return;
			}

			if (data) setPlayersData(data);
		};

		loadPlayers();
	}, []);

	/* ------------------------------
	   LOAD TOURNAMENTS (PAGINATED)
	------------------------------ */
	const loadTournaments = useCallback(
		async (reset: boolean) => {
			if (fetchingRef.current) return;
			if (!hasMore && !reset) return;

			fetchingRef.current = true;
			setLoading(true);

			if (reset) {
				cursorRef.current = null;
				setHasMore(true);
			}

			let query = supabase
				.from("tournaments")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(PAGE_SIZE);

			if (cursorRef.current) {
				query = query.lt("created_at", cursorRef.current);
			}

			const { data, error } = await query;

			if (error) {
				setError(error.message);
				setLoading(false);
				fetchingRef.current = false;
				return;
			}

			const rows = (data ?? []) as Tournament[];

			if (rows.length < PAGE_SIZE) setHasMore(false);

			if (rows.length) {
				cursorRef.current = rows[rows.length - 1].created_at;
			}

			setTournaments((prev) => (reset ? rows : [...prev, ...rows]));

			setLoading(false);
			fetchingRef.current = false;
		},
		[hasMore]
	);

	/* ------------------------------
	   INITIAL LOAD
	------------------------------ */
	useEffect(() => {
		(async () => {
			await loadTournaments(true);
		})();
	}, [loadTournaments]);

	/* ------------------------------
	   INFINITE SCROLL (MATCHES)
	------------------------------ */
	useEffect(() => {
		const onScroll = () => {
			if (
				fetchingRef.current ||
				!hasMore ||
				window.innerHeight + window.scrollY <
					document.body.offsetHeight - 300
			)
				return;

			loadTournaments(false);
		};

		window.addEventListener("scroll", onScroll);
		return () => window.removeEventListener("scroll", onScroll);
	}, [hasMore, loadTournaments]);

	const playersMap = useMemo(
		() => new Map(playersData.map((p) => [p.id, p.player_name])),
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
				{filteredTournaments.map((t) => {
					const status = t.completed
						? "Completed"
						: t.started
							? "In Progress"
							: "Upcoming";

					const winnerName =
						t.completed && t.winner
							? playersMap.get(t.winner)
							: null;

					return (
						<div
							key={t.id}
							onClick={() =>
								(window.location.href = `/tournaments/${t.id}`)
							}
							className="bg-card p-4 rounded-xl hover-card cursor-pointer transition"
						>
							<div className="flex justify-between gap-6">
								<div className="flex-1 min-w-0 space-y-1.5">
									<h2 className="font-semibold text-[clamp(1rem,4vw,1.125rem)] truncate">
										{t.tournament_name}
									</h2>

									<p className="text-text-subtle text-[clamp(0.8rem,3.5vw,0.875rem)] leading-snug line-clamp-2">
										{t.tournament_description?.trim() ||
											"No Description"}
									</p>

									{winnerName && (
										<p className="text-[clamp(0.75rem,3vw,0.85rem)] text-text-muted">
											Winner:{" "}
											<Link
												href={`/profile/${winnerName}`}
												onClick={(e) =>
													e.stopPropagation()
												}
												className="hover:underline"
											>
												{winnerName}
											</Link>
										</p>
									)}
								</div>

								<div className="text-right text-[clamp(0.75rem,3vw,0.85rem)] text-text-muted shrink-0 space-y-1">
									<div className="font-medium">{status}</div>
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

				{error && (
					<p className="text-center text-red-500 py-4">
						Error loading tournaments: {error}
					</p>
				)}
			</section>
		</main>
	);
}
