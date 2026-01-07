"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Matches from "@/components/matches/Matches";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Area,
} from "recharts";
import type {
	MatchType,
	MatchesRow,
	PlayersRow,
	GroupsRow,
} from "@/types/database";
import Link from "next/link";

export default function Profile() {
	const { username } = useParams<{ username: string }>();
	const router = useRouter();

	const [player, setPlayer] = useState<PlayersRow | null>(null);
	const [matches, setMatches] = useState<MatchesRow[]>([]);
	const [groups, setGroups] = useState<GroupsRow[]>([]);
	const [matchType, setMatchType] = useState<MatchType>("singles");
	const [range, setRange] = useState<number | null>(null);

	/* ---------- Load player ---------- */
	useEffect(() => {
		const loadPlayer = async () => {
			const { data } = await supabase
				.from("players")
				.select("*")
				.eq("player_name", username)
				.single();

			if (!data) {
				router.push("/");
				return;
			}

			setPlayer(data);
		};

		loadPlayer();
	}, [username, router]);

	/* ---------- Load groups ---------- */
	useEffect(() => {
		const loadGroups = async () => {
			const { data } = await supabase.from("groups").select("*");
			if (data) setGroups(data);
		};
		loadGroups();
	}, []);

	/* ---------- Load matches ---------- */
	useEffect(() => {
		if (!player) return;

		const loadMatches = async () => {
			const { data } = await supabase
				.from("matches")
				.select("*")
				.eq("match_type", matchType)
				.or(
					`player_a1_id.eq.${player.id},player_a2_id.eq.${player.id},player_b1_id.eq.${player.id},player_b2_id.eq.${player.id}`
				)
				.order("created_at", { ascending: true });

			setMatches((data ?? []) as MatchesRow[]);
		};

		loadMatches();
	}, [player, matchType]);

	const groupName = useMemo(() => {
		if (!player || !player.group_id) return null;
		return groups.find((g) => g.id === player.group_id)?.group_name ?? null;
	}, [player, groups]);

	/* ---------- Stats ---------- */
	const stats = useMemo(() => {
		if (!player) return { wins: 0, losses: 0, ratio: "0.00" };

		let wins = 0;
		let losses = 0;

		for (const m of matches) {
			const winners =
				matchType === "singles"
					? [m.winner1].filter(Boolean)
					: [m.winner1, m.winner2].filter(Boolean);
			if (!winners.length) continue;

			if (winners.includes(player.id)) wins++;
			else losses++;
		}

		return {
			wins,
			losses,
			ratio:
				wins + losses > 0 ? (wins / (losses || 1)).toFixed(2) : "0.00",
		};
	}, [matches, player, matchType]);

	/* ---------- Elo chart ---------- */
	const chartData = useMemo(() => {
		if (!matches.length || !player) return [];

		// Filter matches by type
		const filtered = matches.filter((m) => m.match_type === matchType);

		if (!filtered.length) return [];

		const minDate = new Date(filtered[0].created_at);
		const maxDate = new Date(filtered[filtered.length - 1].created_at);

		// All dates in range
		const dayArray: string[] = [];
		const d = new Date(minDate);
		while (d <= maxDate) {
			dayArray.push(d.toISOString().slice(0, 10));
			d.setDate(d.getDate() + 1);
		}

		// Group matches by day
		const matchesByDay: Record<string, MatchesRow[]> = {};
		filtered.forEach((m) => {
			const day = new Date(m.created_at).toISOString().slice(0, 10);
			if (!matchesByDay[day]) matchesByDay[day] = [];
			matchesByDay[day].push(m);
		});

		// Create chart points
		const data: { x: number; date: string; elo: number }[] = [];
		dayArray.forEach((day, dayIndex) => {
			const dayMatches = matchesByDay[day] ?? [];
			dayMatches.forEach((match, i) => {
				let elo: number | null = null;
				if (match.player_a1_id === player.id)
					elo = match.elo_before_a1 + match.elo_change_a;
				else if (match.player_a2_id === player.id)
					elo = (match.elo_before_a2 ?? 0) + match.elo_change_a;
				else if (match.player_b1_id === player.id)
					elo = match.elo_before_b1 + match.elo_change_b;
				else if (match.player_b2_id === player.id)
					elo = (match.elo_before_b2 ?? 0) + match.elo_change_b;

				if (elo == null) return;

				const x = dayIndex + (i + 1) / (dayMatches.length + 1);
				data.push({ x, date: day, elo });
			});
		});

		return data;
	}, [matches, player, matchType]);

	const xTicks = useMemo(() => {
		const ticks: number[] = [];
		if (!chartData.length) return ticks;
		const minDay = Math.floor(chartData[0].x);
		const maxDay = Math.floor(chartData[chartData.length - 1].x);
		for (let i = minDay; i <= maxDay; i++) ticks.push(i);
		return ticks;
	}, [chartData]);

	const xTickFormatter = (x: number) => {
		const day = chartData.find((d) => Math.floor(d.x) === x);
		return day
			? new Date(day.date).toLocaleDateString("en-US", {
					month: "2-digit",
					day: "2-digit",
			  })
			: "";
	};

	const yDomain = useMemo(() => {
		if (!chartData.length) return [0, 2500];
		const elos = chartData.map((d) => d.elo);
		const min = Math.min(...elos);
		const max = Math.max(...elos);
		return [Math.max(0, min - 50), max + 50];
	}, [chartData]);

	if (!player) return null;

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HERO */}
			<section className="text-center space-y-4 md:space-y-6">
				<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
					{player.player_name}
				</h1>
				<p className="text-lg text-text-muted">
					Singles Elo: {player.singles_elo} | Group:{" "}
					{groupName ?? "None"} | Doubles Elo: {player.doubles_elo}
				</p>

				{/* Buttons like leaderboard */}
				<div className="flex flex-wrap justify-center gap-2 mt-2">
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
					<button
						className="px-4 py-2 rounded-lg border border-border text-sm"
						onClick={() => alert("Report feature coming soon")}
					>
						Report Player
					</button>
				</div>
			</section>

			{/* Stats */}
			<section className="grid grid-cols-3 gap-4 text-center md:text-left">
				<Stat label="Wins" value={stats.wins} />
				<Stat label="Losses" value={stats.losses} />
				<Stat label="Win Ratio" value={stats.ratio} />
			</section>

			{/* Elo Chart */}
			<section>
				<h2 className="text-xl font-semibold mb-4">
					{matchType === "singles" ? "Singles Elo" : "Doubles Elo"}{" "}
					Over Time
				</h2>
				{chartData.length === 0 ? (
					<p className="text-gray-400 text-sm">
						No Elo history available.
					</p>
				) : (
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
									payload?.length &&
									payload[0].value != null ? (
										<div className="bg-card px-3 py-2 rounded-lg text-sm">
											Elo {Math.round(payload[0].value)}
										</div>
									) : null
								}
							/>
							<Area
								type="monotone"
								dataKey="elo"
								fill="rgba(79,70,229,0.15)"
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
				)}
			</section>

			{/* Match History */}
			<section className="space-y-6">
				<Matches
					profilePlayerId={player.id}
					initialMatchType={matchType}
				/>
			</section>
		</main>
	);
}

function Stat({ label, value }: { label: string; value: number | string }) {
	return (
		<div className="p-4">
			<p className="text-sm text-text-muted">{label}</p>
			<p className="text-2xl font-bold">{value}</p>
		</div>
	);
}
