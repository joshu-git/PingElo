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
} from "recharts";
import type { MatchType, MatchesRow, PlayersRow } from "@/types/database";

export default function Profile() {
	const { username } = useParams<{ username: string }>();
	const router = useRouter();

	const [player, setPlayer] = useState<PlayersRow | null>(null);
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

	/* ---------- Stats ---------- */
	const stats = useMemo(() => {
		if (!player) return { wins: 0, losses: 0, ratio: "0.00" };
		let wins = 0;
		let losses = 0;

		for (const m of matches) {
			const winners = [m.winner1, m.winner2].filter(Boolean);
			if (!winners.length) continue;

			if (winners.includes(player.id)) wins++;
			else losses++;
		}

		return {
			wins,
			losses,
			ratio: wins + losses > 0 ? (wins / losses).toFixed(2) : "0.00",
		};
	}, [matches, player]);

	/* ---------- Elo history ---------- */
	const eloHistory = useMemo(() => {
		if (!player || !matches.length) return [];

		return matches
			.map((m) => {
				let before: number | null = null;
				let change: number | null = null;

				if (m.player_a1_id === player.id) {
					before = m.elo_before_a1;
					change = m.elo_change_a;
				} else if (m.player_a2_id === player.id) {
					before = m.elo_before_a2 ?? null;
					change = m.elo_change_a;
				} else if (m.player_b1_id === player.id) {
					before = m.elo_before_b1;
					change = m.elo_change_b;
				} else if (m.player_b2_id === player.id) {
					before = m.elo_before_b2 ?? null;
					change = m.elo_change_b;
				}

				if (before == null || change == null) return null;

				return {
					day: new Date(m.created_at).toLocaleDateString(),
					elo: before + change,
				};
			})
			.filter(Boolean) as { day: string; elo: number }[];
	}, [matches, player]);

	const yDomain = useMemo(() => {
		if (!eloHistory.length) return [0, 2500];
		const elos = eloHistory.map((e) => e.elo);
		const min = Math.min(...elos);
		const max = Math.max(...elos);
		const buffer = 50;
		return [Math.max(0, min - buffer), max + buffer];
	}, [eloHistory]);

	if (!player) return null;

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* ---------- Header ---------- */}
			<section className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">
					{player.player_name}
				</h1>
				<button
					className="px-4 py-2 rounded-lg border border-border hover:bg-card hover:text-text transition"
					onClick={() => alert("Report feature coming soon")}
				>
					Report Player
				</button>
			</section>

			{/* ---------- Match Type + Range ---------- */}
			<section className="flex flex-wrap items-center gap-4">
				<div className="flex gap-2">
					{["singles", "doubles"].map((type) => (
						<button
							key={type}
							onClick={() => setMatchType(type as MatchType)}
							className={`px-4 py-2 rounded-lg ${
								matchType === type
									? "font-semibold underline"
									: ""
							}`}
						>
							{type[0].toUpperCase() + type.slice(1)}
						</button>
					))}
				</div>
				<div className="flex gap-2">
					{[7, 30].map((d) => (
						<button
							key={d}
							onClick={() => setRange(d)}
							className={`px-3 py-1.5 rounded-lg text-sm ${
								range === d ? "font-semibold underline" : ""
							}`}
						>
							Last {d} days
						</button>
					))}
					<button
						onClick={() => setRange(null)}
						className={`px-3 py-1.5 rounded-lg text-sm ${
							range === null ? "font-semibold underline" : ""
						}`}
					>
						All Time
					</button>
				</div>
			</section>

			{/* ---------- Stats ---------- */}
			<section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Stat label="Wins" value={stats.wins} />
				<Stat label="Losses" value={stats.losses} />
				<Stat label="Win Ratio" value={stats.ratio} />
			</section>

			{/* ---------- Elo Chart ---------- */}
			<section className="bg-card p-6 rounded-xl">
				<h2 className="text-xl font-semibold mb-4">
					{matchType === "singles" ? "Singles" : "Doubles"} Elo Over
					Time
				</h2>
				{eloHistory.length === 0 ? (
					<p className="text-text-muted text-sm">
						No Elo history available.
					</p>
				) : (
					<ResponsiveContainer width="100%" height={250}>
						<LineChart data={eloHistory}>
							<XAxis
								dataKey="day"
								tick={{ fill: "#aaa", fontSize: 12 }}
							/>
							<YAxis
								domain={yDomain as [number, number]}
								tick={{ fill: "#aaa", fontSize: 12 }}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: "#111",
									border: "1px solid rgba(255,255,255,0.1)",
									borderRadius: 8,
								}}
								labelStyle={{ color: "#aaa" }}
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
				)}
			</section>

			{/* ---------- Match History ---------- */}
			<section className="space-y-6">
				<Matches profilePlayerId={player.id} />
			</section>
		</main>
	);
}

function Stat({ label, value }: { label: string; value: number | string }) {
	return (
		<div className="bg-card p-4 rounded-xl text-center hover-card transition">
			<p className="text-sm text-text-muted">{label}</p>
			<p className="text-2xl font-bold">{value}</p>
		</div>
	);
}
