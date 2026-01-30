"use client";

import { useEffect, useMemo, useState } from "react";
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

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type PlayerRow = {
	id: string;
	player_name: string;
};

type TeamPlayer = {
	id: string;
	before: number | null;
};

const PAGE_SIZE = 1000;

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatDay = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
		d.getDate()
	).padStart(2, "0")}`;

const getPlayerSide = (
	match: MatchesRow,
	playerId: string
): "A" | "B" | null => {
	if (match.player_a1_id === playerId || match.player_a2_id === playerId)
		return "A";
	if (match.player_b1_id === playerId || match.player_b2_id === playerId)
		return "B";
	return null;
};

const getPlayerEloAfter = (
	match: MatchesRow,
	playerId: string
): number | null => {
	if (match.player_a1_id === playerId)
		return (match.elo_before_a1 ?? 0) + (match.elo_change_a ?? 0);
	if (match.player_a2_id === playerId)
		return (match.elo_before_a2 ?? 0) + (match.elo_change_a ?? 0);
	if (match.player_b1_id === playerId)
		return (match.elo_before_b1 ?? 0) + (match.elo_change_b ?? 0);
	if (match.player_b2_id === playerId)
		return (match.elo_before_b2 ?? 0) + (match.elo_change_b ?? 0);
	return null;
};

const fetchAllMatchesForPlayer = async (playerId: string) => {
	let from = 0;
	let to = PAGE_SIZE - 1;
	const all: MatchesRow[] = [];

	while (true) {
		const { data, error } = await supabase
			.from("matches")
			.select("*")
			.or(
				`player_a1_id.eq.${playerId},player_a2_id.eq.${playerId},player_b1_id.eq.${playerId},player_b2_id.eq.${playerId}`
			)
			.order("created_at", { ascending: false })
			.range(from, to);

		if (error) throw error;
		if (!data || data.length === 0) break;

		all.push(...data);
		if (data.length < PAGE_SIZE) break;

		from += PAGE_SIZE;
		to += PAGE_SIZE;
	}

	return all;
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function Profile() {
	const { playerName } = useParams<{ playerName: string }>();
	const router = useRouter();

	const [player, setPlayer] = useState<PlayersRow | null>(null);
	const [playersData, setPlayersData] = useState<PlayerRow[]>([]);
	const [groupName, setGroupName] = useState<string | null>(null);
	const [matches, setMatches] = useState<MatchesRow[]>([]);
	const [matchType, setMatchType] = useState<MatchType>("singles");
	const [range, setRange] = useState<number | null>(30);

	/* ----------------------------- Player ----------------------------- */

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

	/* ---------------------------- Players ----------------------------- */

	useEffect(() => {
		const loadPlayers = async () => {
			const { data } = await supabase
				.from("players")
				.select("id, player_name");

			if (data) setPlayersData(data as PlayerRow[]);
		};

		loadPlayers();
	}, []);

	const players = useMemo(
		() => new Map(playersData.map((p) => [p.id, p])),
		[playersData]
	);

	/* ----------------------------- Group ------------------------------ */

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

	/* ---------------------------- Matches ----------------------------- */

	useEffect(() => {
		if (!player) return;

		let cancelled = false;

		const loadMatches = async () => {
			const all = await fetchAllMatchesForPlayer(player.id);
			if (!cancelled) setMatches(all);
		};

		loadMatches();

		return () => {
			cancelled = true;
		};
	}, [player]);

	/* --------------------------- Filtering ---------------------------- */

	const filteredMatches = useMemo(() => {
		const cutoff =
			range !== null
				? new Date(Date.now() - range * 24 * 60 * 60 * 1000)
				: null;

		return matches.filter((m) => {
			if (m.match_type !== matchType) return false;
			if (cutoff && new Date(m.created_at) < cutoff) return false;
			return true;
		});
	}, [matches, matchType, range]);

	/* ----------------------------- Stats ------------------------------ */

	const stats = useMemo(() => {
		if (!player) return { wins: 0, losses: 0, rate: 0 };

		let wins = 0;
		let losses = 0;

		for (const m of filteredMatches) {
			const side = getPlayerSide(m, player.id);
			if (!side) continue;

			const teamAWon = m.score_a > m.score_b;
			const won =
				(side === "A" && teamAWon) || (side === "B" && !teamAWon);

			won ? wins++ : losses++;
		}

		return {
			wins,
			losses,
			rate: losses ? Number((wins / losses).toFixed(2)) : wins,
		};
	}, [filteredMatches, player]);

	/* ----------------------------- Chart ------------------------------ */

	const chartData = useMemo(() => {
		if (!player || filteredMatches.length === 0) return [];

		const sorted = [...filteredMatches].sort(
			(a, b) =>
				new Date(a.created_at).getTime() -
				new Date(b.created_at).getTime()
		);

		const byDay: Record<string, MatchesRow[]> = {};
		for (const m of sorted) {
			const day = formatDay(new Date(m.created_at));
			(byDay[day] ||= []).push(m);
		}

		const min = new Date(sorted[0].created_at);
		const max = new Date(sorted[sorted.length - 1].created_at);
		min.setHours(0, 0, 0, 0);
		max.setHours(0, 0, 0, 0);

		const days: string[] = [];
		for (let d = new Date(min); d <= max; d.setDate(d.getDate() + 1)) {
			days.push(formatDay(d));
		}

		const data: { x: number; date: string; elo: number }[] = [];

		days.forEach((day, dayIndex) => {
			const dayMatches = byDay[day] ?? [];
			dayMatches.forEach((m, i) => {
				const elo = getPlayerEloAfter(m, player.id);
				if (elo === null) return;

				data.push({
					x: dayIndex + (i + 1) / (dayMatches.length + 1),
					date: day,
					elo,
				});
			});
		});

		return data;
	}, [filteredMatches, player]);

	const yDomain = useMemo(() => {
		if (chartData.length === 0) return [0, 2500];
		const elos = chartData.map((d) => d.elo);
		return [Math.max(0, Math.min(...elos) - 50), Math.max(...elos) + 50];
	}, [chartData]);

	const xTicks = useMemo(
		() => Array.from(new Set(chartData.map((d) => Math.floor(d.x)))),
		[chartData]
	);

	const xTickFormatter = (x: number) => {
		const d = chartData.find((d) => Math.floor(d.x) === x);
		return d
			? new Date(d.date).toLocaleDateString("en-GB", {
					month: "2-digit",
					day: "2-digit",
				})
			: "";
	};

	if (!player) return null;

	const eloAfter = (before: number | null, change: number | null) =>
		before !== null && change !== null ? before + change : null;

	/* ------------------------------ JSX ------------------------------- */

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
					<LineChart
						data={chartData}
						margin={{ top: 10, right: 10, bottom: 30, left: 0 }}
					>
						<XAxis
							dataKey="x"
							type="number"
							tickFormatter={xTickFormatter}
							ticks={xTicks}
							tick={{ fill: "#aaa", fontSize: 12 }}
							axisLine={{ stroke: "#444" }}
							tickLine={{ stroke: "#444" }}
						/>
						<YAxis
							dataKey="elo"
							domain={yDomain}
							tick={{ fill: "#aaa", fontSize: 12 }}
							width={50}
							axisLine={{ stroke: "#444" }}
							tickLine={{ stroke: "#444" }}
						/>
						<Tooltip
							content={({ payload }) =>
								payload?.length && payload[0].value != null ? (
									<div className="bg-card px-3 py-2 rounded-lg text-sm">
										Elo {Math.round(payload[0].value)}
									</div>
								) : null
							}
						/>
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
							activeDot={{ r: 4 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</section>

			{/* PLAYER MATCHES */}
			<section className="space-y-3">
				{filteredMatches.map((m) => {
					const teamA = [
						{ id: m.player_a1_id, before: m.elo_before_a1 },
						m.player_a2_id
							? {
									id: m.player_a2_id,
									before: m.elo_before_a2,
								}
							: null,
					].filter((p): p is TeamPlayer => p !== null);

					const teamB = [
						{ id: m.player_b1_id, before: m.elo_before_b1 },
						m.player_b2_id
							? {
									id: m.player_b2_id,
									before: m.elo_before_b2,
								}
							: null,
					].filter((p): p is TeamPlayer => p !== null);

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
														href={`/profile/${
															players.get(p.id)
																?.player_name ??
															p.id
														}`}
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
														href={`/profile/${
															players.get(p.id)
																?.player_name ??
															p.id
														}`}
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
									<div>{playerWon ? "Win" : "Loss"}</div>
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
