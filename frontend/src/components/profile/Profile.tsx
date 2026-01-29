"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
	ResponsiveContainer,
	LineChart,
	Line,
	Area,
	XAxis,
	YAxis,
	Tooltip,
} from "recharts";
import type { MatchType, MatchesRow, PlayersRow } from "@/types/database";

type PlayerRow = {
	id: string;
	player_name: string;
};

const PAGE_SIZE = 50;

export default function Profile() {
	const { playerName } = useParams<{ playerName: string }>();
	const router = useRouter();

	const [player, setPlayer] = useState<PlayersRow | null>(null);
	const [players, setPlayers] = useState<Map<string, PlayerRow>>(new Map());
	const [groupName, setGroupName] = useState<string | null>(null);
	const [matches, setMatches] = useState<MatchesRow[]>([]);
	const [matchType, setMatchType] = useState<MatchType>("singles");
	const [range, setRange] = useState<number | null>(null);

	const pageRef = useRef(1);
	const loadingRef = useRef(false);
	const [hasMore, setHasMore] = useState(true);

	//Load the player
	useEffect(() => {
		const loadPlayer = async () => {
			const { data } = await supabase
				.from("players")
				.select("*")
				.eq("player_name", playerName)
				.single();

			if (!data) {
				router.push("/");
				return;
			}
			setPlayer(data);
		};
		loadPlayer();
	}, [playerName, router]);

	//Load all players for ID → name mapping
	useEffect(() => {
		const loadPlayers = async () => {
			const { data } = await supabase
				.from("players")
				.select("id, player_name");
			if (data) {
				setPlayers(
					new Map((data as PlayerRow[]).map((p) => [p.id, p]))
				);
			}
		};
		loadPlayers();
	}, []);

	//Load the player's group
	useEffect(() => {
		if (!player?.group_id) return;
		const loadGroup = async () => {
			const { data } = await supabase
				.from("groups")
				.select("group_name")
				.eq("id", player.group_id)
				.single();
			setGroupName(data?.group_name ?? null);
		};
		loadGroup();
	}, [player?.group_id]);

	//Load the player's matches (ALL, for graph)
	useEffect(() => {
		if (!player) return;

		const loadMatches = async () => {
			const { data } = await supabase
				.from("matches")
				.select("*")
				.or(
					`player_a1_id.eq.${player.id},player_a2_id.eq.${player.id},player_b1_id.eq.${player.id},player_b2_id.eq.${player.id}`
				)
				.order("created_at", { ascending: false });

			setMatches((data ?? []) as MatchesRow[]);
		};
		loadMatches();
	}, [player]);

	//Filter the matches by type and range
	const filteredMatches = useMemo(() => {
		let m = matches.filter((m) => m.match_type === matchType);

		if (range != null) {
			const cutoff = new Date();
			cutoff.setDate(cutoff.getDate() - range);
			m = m.filter((match) => new Date(match.created_at) >= cutoff);
		}

		return m;
	}, [matches, matchType, range]);

	//Reset pagination when filters change
	useEffect(() => {
		pageRef.current = 1;
		setHasMore(filteredMatches.length > PAGE_SIZE);
	}, [filteredMatches]);

	const visibleMatches = useMemo(() => {
		return filteredMatches.slice(0, pageRef.current * PAGE_SIZE);
	}, [filteredMatches]);

	//Infinite scroll (same behavior as Matches.tsx)
	useEffect(() => {
		const onScroll = () => {
			if (
				loadingRef.current ||
				!hasMore ||
				window.innerHeight + window.scrollY <
					document.body.offsetHeight - 300
			)
				return;

			loadingRef.current = true;
			pageRef.current += 1;

			if (pageRef.current * PAGE_SIZE >= filteredMatches.length) {
				setHasMore(false);
			}

			loadingRef.current = false;
		};

		window.addEventListener("scroll", onScroll);
		return () => window.removeEventListener("scroll", onScroll);
	}, [filteredMatches.length, hasMore]);

	//Calculates player statistics
	const stats = useMemo(() => {
		if (!player) return { wins: 0, losses: 0, rate: 0 };
		let wins = 0;
		let losses = 0;

		for (const m of filteredMatches) {
			const teamAWon = m.score_a > m.score_b;
			const isOnTeamA = [m.player_a1_id, m.player_a2_id].includes(
				player.id
			);
			const isOnTeamB = [m.player_b1_id, m.player_b2_id].includes(
				player.id
			);

			if ((teamAWon && isOnTeamA) || (!teamAWon && isOnTeamB)) wins++;
			else losses++;
		}

		return {
			wins,
			losses,
			rate: losses > 0 ? Number((wins / losses).toFixed(2)) : wins,
		};
	}, [filteredMatches, player]);

	//Chart data
	const chartData = useMemo(() => {
		if (!filteredMatches.length) return [];

		const matchesByDay: Record<string, MatchesRow[]> = {};
		filteredMatches.forEach((m) => {
			const d = new Date(m.created_at);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
				2,
				"0"
			)}-${String(d.getDate()).padStart(2, "0")}`;
			(matchesByDay[key] ??= []).push(m);
		});

		const minDate = new Date(
			filteredMatches[filteredMatches.length - 1].created_at
		);
		const maxDate = new Date(filteredMatches[0].created_at);
		minDate.setHours(0, 0, 0, 0);
		maxDate.setHours(0, 0, 0, 0);

		const days: string[] = [];
		for (
			let d = new Date(minDate);
			d <= maxDate;
			d.setDate(d.getDate() + 1)
		)
			days.push(
				`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
					2,
					"0"
				)}-${String(d.getDate()).padStart(2, "0")}`
			);

		const data: { x: number; date: string; elo: number }[] = [];

		days.forEach((day, dayIndex) => {
			(matchesByDay[day] ?? []).forEach((m, i) => {
				let elo = 0;
				if (m.player_a1_id === player?.id)
					elo = (m.elo_before_a1 ?? 0) + (m.elo_change_a ?? 0);
				else if (m.player_a2_id === player?.id)
					elo = (m.elo_before_a2 ?? 0) + (m.elo_change_a ?? 0);
				else if (m.player_b1_id === player?.id)
					elo = (m.elo_before_b1 ?? 0) + (m.elo_change_b ?? 0);
				else if (m.player_b2_id === player?.id)
					elo = (m.elo_before_b2 ?? 0) + (m.elo_change_b ?? 0);

				data.push({
					x: dayIndex + (i + 1) / (matchesByDay[day].length + 1),
					date: day,
					elo,
				});
			});
		});

		return data;
	}, [filteredMatches, player]);

	const eloAfter = (before?: number | null, change?: number | null) =>
		before != null && change != null ? before + change : null;

	if (!player) return null;

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HERO */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
					{player.player_name}
				</h1>
				<p className="text-text-muted">
					Singles: {player.singles_elo} · {groupName ?? "No Group"} ·
					Doubles: {player.doubles_elo}
				</p>
			</section>

			{/* STATS */}
			<section className="grid grid-cols-3 gap-4 text-center">
				<Stat label="Wins" value={stats.wins} />
				<Stat label="Losses" value={stats.losses} />
				<Stat label="W / L" value={`${stats.rate}`} />
			</section>

			{/* CONTROLS */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-wrap justify-center gap-2">
					<button
						onClick={() => setMatchType("singles")}
						className={`px-4 py-2 rounded-lg ${
							matchType === "singles"
								? "font-semibold underline"
								: ""
						}`}
					>
						Singles
					</button>
					<button
						onClick={() => setMatchType("doubles")}
						className={`px-4 py-2 rounded-lg ${
							matchType === "doubles"
								? "font-semibold underline"
								: ""
						}`}
					>
						Doubles
					</button>
					<button className="px-4 py-2 rounded-lg">Report</button>
				</div>

				<div className="flex flex-wrap justify-center gap-2">
					{[7, 30].map((d) => (
						<button
							key={d}
							onClick={() => setRange(d)}
							className={`px-4 py-2 rounded-lg ${
								range === d ? "font-semibold underline" : ""
							}`}
						>
							Last {d} Days
						</button>
					))}
					<button
						onClick={() => setRange(null)}
						className={`px-4 py-2 rounded-lg ${
							range === null ? "font-semibold underline" : ""
						}`}
					>
						All Time
					</button>
				</div>
			</div>

			{/* ELO CHART */}
			<section>
				<ResponsiveContainer width="100%" height={280}>
					<LineChart data={chartData}>
						<XAxis dataKey="x" type="number" hide />
						<YAxis dataKey="elo" hide />
						<Tooltip />
						<Area
							type="monotone"
							dataKey="elo"
							fill="rgba(79,70,229,0.25)"
							stroke="none"
						/>
						<Line
							type="monotone"
							dataKey="elo"
							stroke="#4f46e5"
							strokeWidth={2}
							dot={false}
						/>
					</LineChart>
				</ResponsiveContainer>
			</section>

			{/* PLAYER MATCHES */}
			<section className="space-y-3">
				{visibleMatches.map((m) => {
					const teamA = [
						{ id: m.player_a1_id, before: m.elo_before_a1 },
						m.player_a2_id && {
							id: m.player_a2_id,
							before: m.elo_before_a2,
						},
					].filter(Boolean) as {
						id: string;
						before?: number | null;
					}[];

					const teamB = [
						{ id: m.player_b1_id, before: m.elo_before_b1 },
						m.player_b2_id && {
							id: m.player_b2_id,
							before: m.elo_before_b2,
						},
					].filter(Boolean) as {
						id: string;
						before?: number | null;
					}[];

					const teamAWon = m.score_a > m.score_b;
					const playerWon =
						(teamAWon && teamA.some((p) => p.id === player.id)) ||
						(!teamAWon && teamB.some((p) => p.id === player.id));

					const nameSizeClass =
						matchType === "singles"
							? "text-[clamp(0.85rem,4vw,1rem)]"
							: "text-[clamp(0.75rem,2.5vw,1rem)]";
					const eloSizeClass =
						matchType === "singles"
							? "text-[clamp(0.7rem,3vw,0.85rem)]"
							: "text-[clamp(0.65rem,2vw,0.85rem)]";

					return (
						<div
							key={m.id}
							onClick={() => router.push(`/matches/${m.id}`)}
							className="bg-card p-4 rounded-xl hover-card cursor-pointer"
						>
							<div className="flex justify-between gap-6">
								<div className="flex-1 space-y-3">
									{/* TEAM A */}
									<div className="flex justify-between items-center">
										<div
											className={`flex gap-1 whitespace-nowrap ${nameSizeClass}`}
										>
											{teamA.map((p, i) => (
												<span
													key={p.id}
													className="flex items-center gap-1"
												>
													<Link
														href={`/profile/${players.get(p.id)?.player_name ?? p.id}`}
														onClick={(e) =>
															e.stopPropagation()
														}
														className="hover:underline"
													>
														{players.get(p.id)
															?.player_name ??
															p.id}
													</Link>
													<span
														className={`${eloSizeClass} text-text-subtle`}
													>
														(
														{eloAfter(
															p.before,
															m.elo_change_a
														) ?? "—"}
														)
													</span>
													{i === 0 &&
														teamA.length > 1 &&
														" & "}
												</span>
											))}
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<span className="text-sm text-text-muted">
												{m.elo_change_a >= 0 && "+"}
												{m.elo_change_a}
											</span>
											<span className="text-lg font-bold">
												{m.score_a}
											</span>
										</div>
									</div>

									{/* TEAM B */}
									<div className="flex justify-between items-center">
										<div
											className={`flex gap-1 whitespace-nowrap ${nameSizeClass}`}
										>
											{teamB.map((p, i) => (
												<span
													key={p.id}
													className="flex items-center gap-1"
												>
													<Link
														href={`/profile/${players.get(p.id)?.player_name ?? p.id}`}
														onClick={(e) =>
															e.stopPropagation()
														}
														className="hover:underline"
													>
														{players.get(p.id)
															?.player_name ??
															p.id}
													</Link>
													<span
														className={`${eloSizeClass} text-text-subtle`}
													>
														(
														{eloAfter(
															p.before,
															m.elo_change_b
														) ?? "—"}
														)
													</span>
													{i === 0 &&
														teamB.length > 1 &&
														" & "}
												</span>
											))}
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<span className="text-sm text-text-muted">
												{m.elo_change_b >= 0 && "+"}
												{m.elo_change_b}
											</span>
											<span className="text-lg font-bold">
												{m.score_b}
											</span>
										</div>
									</div>
								</div>

								{/* META */}
								<div className="text-sm text-text-muted text-right shrink-0">
									{playerWon != null && (
										<div>{playerWon ? "Win" : "Loss"}</div>
									)}
									<div>
										{new Date(
											m.created_at
										).toLocaleDateString()}
									</div>
									{m.tournament_id && (
										<div className="inline-block mt-1 px-2 py-0.5 text-xs rounded-md bg-border text-text-muted">
											Tournament
										</div>
									)}
								</div>
							</div>
						</div>
					);
				})}
			</section>
		</main>
	);
}

function Stat({ label, value }: { label: string; value: number | string }) {
	return (
		<div className="text-center">
			<p className="text-sm text-text-muted">{label}</p>
			<p className="text-2xl font-bold">{value}</p>
		</div>
	);
}
