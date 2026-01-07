"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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

/* ------------------------------------------------------------------
 * Profile page – single component, schema-aligned
 * ------------------------------------------------------------------ */
export default function Profile() {
	const { username } = useParams<{ username: string }>();
	const router = useRouter();

	const [player, setPlayer] = useState<PlayersRow | null>(null);
	const [matches, setMatches] = useState<MatchesRow[]>([]);
	const [matchType, setMatchType] = useState<MatchType>("singles");
	const [loading, setLoading] = useState(true);

	/* ------------------------------------------------------------------
	 * Load player
	 * ------------------------------------------------------------------ */
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

	/* ------------------------------------------------------------------
	 * Load matches (reacts to singles / doubles toggle)
	 * ------------------------------------------------------------------ */
	useEffect(() => {
		if (!player) return;

		const loadMatches = async () => {
			setLoading(true);

			const { data } = await supabase
				.from("matches")
				.select("*")
				.eq("match_type", matchType)
				.or(
					`player_a1_id.eq.${player.id},player_a2_id.eq.${player.id},player_b1_id.eq.${player.id},player_b2_id.eq.${player.id}`
				)
				.order("match_number", { ascending: true });

			setMatches((data ?? []) as MatchesRow[]);
			setLoading(false);
		};

		loadMatches();
	}, [player, matchType]);

	/* ------------------------------------------------------------------
	 * Stats (reacts to matchType)
	 * ------------------------------------------------------------------ */
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

	/* ------------------------------------------------------------------
	 * Elo history (reacts to matchType)
	 * ------------------------------------------------------------------ */
	const eloHistory = useMemo(() => {
		if (!player) return [] as { match: number; elo: number }[];

		return matches
			.map((m) => {
				const isA1 = m.player_a1_id === player.id;
				const isA2 = m.player_a2_id === player.id;

				let before: number | null = null;
				let change: number | null = null;

				if (isA1) {
					before = m.elo_before_a1;
					change = m.elo_change_a;
				} else if (isA2) {
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
					match: m.match_number,
					elo: before + change,
				};
			})
			.filter(Boolean) as { match: number; elo: number }[];
	}, [matches, player]);

	if (!player) return null;

	/* ------------------------------------------------------------------
	 * Render
	 * ------------------------------------------------------------------ */
	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HEADER */}
			<section className="flex justify-between items-center">
				<h1 className="text-4xl font-extrabold">
					{player.player_name}
				</h1>
				<button
					className="px-4 py-2 rounded-xl border border-border text-sm"
					onClick={() => alert("Report feature coming soon")}
				>
					Report Player
				</button>
			</section>

			{/* MATCH TYPE TOGGLE */}
			<section className="flex gap-4">
				<button
					onClick={() => setMatchType("singles")}
					className={`px-4 py-2 rounded-lg ${
						matchType === "singles" ? "font-semibold underline" : ""
					}`}
				>
					Singles
				</button>
				<button
					onClick={() => setMatchType("doubles")}
					className={`px-4 py-2 rounded-lg ${
						matchType === "doubles" ? "font-semibold underline" : ""
					}`}
				>
					Doubles
				</button>
			</section>

			{/* STATS */}
			<section className="grid grid-cols-3 gap-4 text-center">
				<Stat label="Wins" value={stats.wins} />
				<Stat label="Losses" value={stats.losses} />
				<Stat label="Win Ratio" value={stats.ratio} />
			</section>

			{/* ELO CHART */}
			<section className="bg-black/40 rounded-2xl p-6">
				<h2 className="text-xl font-semibold mb-4">
					{matchType === "singles" ? "Singles Elo" : "Doubles Elo"}{" "}
					Over Time
				</h2>

				{eloHistory.length === 0 ? (
					<p className="text-gray-400 text-sm">
						No Elo history available.
					</p>
				) : (
					<ResponsiveContainer width="100%" height={250}>
						<LineChart data={eloHistory}>
							<XAxis
								dataKey="match"
								tick={{ fill: "#aaa", fontSize: 12 }}
							/>
							<YAxis tick={{ fill: "#aaa", fontSize: 12 }} />
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

			{/* MATCH HISTORY */}
			<section>
				<h2 className="text-2xl font-bold mb-4">Match History</h2>
				<Matches profilePlayerId={player.id} />
			</section>
		</main>
	);
}

/* ------------------------------------------------------------------
 * Local stat tile
 * ------------------------------------------------------------------ */
function Stat({ label, value }: { label: string; value: number | string }) {
	return (
		<div className="bg-black/40 rounded-xl p-4">
			<p className="text-sm text-gray-400">{label}</p>
			<p className="text-2xl font-bold">{value}</p>
		</div>
	);
}
