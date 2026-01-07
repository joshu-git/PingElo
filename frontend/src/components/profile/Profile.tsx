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

	/* ---------- Filtered matches by match type ---------- */
	const filteredMatches = useMemo(() => {
		return matches.filter((m) => m.match_type === matchType);
	}, [matches, matchType]);

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
			rate:
				wins + losses > 0
					? Math.round((wins / (wins + losses)) * 100)
					: 0,
		};
	}, [filteredMatches, player]);

	/* ---------- Elo chart per match ---------- */
	const eloHistory = useMemo(() => {
		if (!player) return [];

		return filteredMatches.map((m) => {
			let elo: number | null = null;

			if (m.player_a1_id === player.id)
				elo = m.elo_before_a1 + m.elo_change_a;
			else if (m.player_a2_id === player.id)
				elo = (m.elo_before_a2 ?? 0) + m.elo_change_a;
			else if (m.player_b1_id === player.id)
				elo = m.elo_before_b1 + m.elo_change_b;
			else if (m.player_b2_id === player.id)
				elo = (m.elo_before_b2 ?? 0) + m.elo_change_b;

			return {
				date: new Date(m.created_at).toLocaleDateString("en-US", {
					month: "2-digit",
					day: "2-digit",
				}),
				elo,
			};
		});
	}, [filteredMatches, player]);

	const yDomain = useMemo(() => {
		if (!eloHistory.length) return [0, 2500];
		const elos = eloHistory.map((e) => e.elo ?? 0);
		const min = Math.min(...elos);
		const max = Math.max(...elos);
		return [Math.max(0, min - 50), max + 50];
	}, [eloHistory]);

	if (!player) return null;

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-10">
			{/* HERO */}
			<section className="text-center space-y-3">
				<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
					{player.player_name}
				</h1>
				<p className="text-text-muted">
					Singles Elo {player.singles_elo} · {groupName ?? "No Group"}{" "}
					· Doubles Elo {player.doubles_elo}
				</p>
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
							Last {d} days
						</button>
					))}
					<button
						onClick={() => setRange(null)}
						className={`px-4 py-2 rounded-lg ${
							range === null ? "font-semibold underline" : ""
						}`}
					>
						All time
					</button>
				</div>
			</div>

			{/* STATS */}
			<section className="grid grid-cols-3 gap-4">
				<Stat label="Wins" value={stats.wins} />
				<Stat label="Losses" value={stats.losses} />
				<Stat label="Win Rate" value={`${stats.rate}%`} />
			</section>

			{/* ELO CHART */}
			<section>
				<ResponsiveContainer width="100%" height={260}>
					<LineChart
						data={eloHistory}
						margin={{ top: 10, right: 0, bottom: 20, left: 0 }}
					>
						<XAxis
							dataKey="date"
							tick={{ fontSize: 12, fill: "#aaa" }}
							height={30}
						/>
						<YAxis
							domain={yDomain}
							tick={{ fontSize: 12, fill: "#aaa" }}
							width={50}
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
