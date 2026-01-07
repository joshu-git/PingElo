"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Matches from "@/components/matches/Matches";
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

export default function Profile() {
	const { username } = useParams<{ username: string }>();
	const router = useRouter();

	const [player, setPlayer] = useState<PlayersRow | null>(null);
	const [groupName, setGroupName] = useState<string | null>(null);
	const [matches, setMatches] = useState<MatchesRow[]>([]);
	const [matchType, setMatchType] = useState<MatchType>("singles");
	const [range, setRange] = useState<number | null>(null); // days: 7, 30, null for all

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

	/* ---------- Load group ---------- */
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

	/* ---------- Load matches ---------- */
	useEffect(() => {
		if (!player) return;

		const loadMatches = async () => {
			const { data } = await supabase
				.from("matches")
				.select("*")
				.or(
					`player_a1_id.eq.${player.id},player_a2_id.eq.${player.id},player_b1_id.eq.${player.id},player_b2_id.eq.${player.id}`
				)
				.order("created_at", { ascending: true });

			setMatches((data ?? []) as MatchesRow[]);
		};
		loadMatches();
	}, [player]);

	/* ---------- Filtered matches by type and range ---------- */
	const filteredMatches = useMemo(() => {
		if (!matches) return [];
		let m = matches.filter((m) => m.match_type === matchType);

		if (range != null) {
			const cutoff = new Date();
			cutoff.setDate(cutoff.getDate() - range);
			m = m.filter((match) => new Date(match.created_at) >= cutoff);
		}

		return m;
	}, [matches, matchType, range]);

	/* ---------- Stats ---------- */
	const stats = useMemo(() => {
		if (!player) return { wins: 0, losses: 0, rate: 0 };
		let wins = 0;
		let losses = 0;

		for (const m of filteredMatches) {
			const winners = [m.winner1, m.winner2].filter(Boolean);
			if (!winners.length) continue;
			if (winners.includes(player.id)) wins++;
			else losses++;
		}

		return {
			wins,
			losses,
			rate: losses > 0 ? Number((wins / losses).toFixed(2)) : wins,
		};
	}, [filteredMatches, player]);

	/* ---------- Elo history per match with fixed day spacing ---------- */
	const chartData = useMemo(() => {
		if (!filteredMatches.length) return [];

		// group matches by date (YYYY-MM-DD)
		const matchesByDay: Record<string, MatchesRow[]> = {};
		const minDate = new Date(filteredMatches[0].created_at);
		const maxDate = new Date(
			filteredMatches[filteredMatches.length - 1].created_at
		);

		filteredMatches.forEach((m) => {
			const day = new Date(m.created_at).toISOString().slice(0, 10);
			if (!matchesByDay[day]) matchesByDay[day] = [];
			matchesByDay[day].push(m);
		});

		// generate all days in range
		const dayArray: string[] = [];
		const d = new Date(minDate);
		while (d <= maxDate) {
			dayArray.push(d.toISOString().slice(0, 10));
			d.setDate(d.getDate() + 1);
		}

		const data: { x: number; date: string; elo: number }[] = [];
		dayArray.forEach((day, dayIndex) => {
			const dayMatches = matchesByDay[day] ?? [];
			dayMatches.forEach((match, i) => {
				let elo: number | null = null;
				if (match.player_a1_id === player?.id)
					elo = match.elo_before_a1 + match.elo_change_a;
				else if (match.player_a2_id === player?.id)
					elo = (match.elo_before_a2 ?? 0) + match.elo_change_a;
				else if (match.player_b1_id === player?.id)
					elo = match.elo_before_b1 + match.elo_change_b;
				else if (match.player_b2_id === player?.id)
					elo = (match.elo_before_b2 ?? 0) + match.elo_change_b;

				if (elo == null) return;

				const x = dayIndex + (i + 1) / (dayMatches.length + 1); // evenly space within day
				data.push({ x, date: day, elo });
			});
		});

		return data;
	}, [filteredMatches, player]);

	const yDomain = useMemo(() => {
		if (!chartData.length) return [0, 2500];
		const elos = chartData.map((d) => d.elo);
		const min = Math.min(...elos);
		const max = Math.max(...elos);
		return [Math.max(0, min - 50), max + 50];
	}, [chartData]);

	const xTicks = useMemo(() => {
		// get unique day indices for x axis
		const daysSet = new Set(chartData.map((d) => Math.floor(d.x)));
		return Array.from(daysSet);
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

	if (!player) return null;

	return (
		<main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
			{/* HERO */}
			<section className="text-center space-y-3">
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
				{/* Left: Match Type Buttons */}
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

				{/* Right: Range Buttons */}
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

			{/* MATCHES */}
			<Matches profilePlayerId={player.id} />
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
