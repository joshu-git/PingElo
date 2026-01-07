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

/* ------------------------------------------------------------------
 * Types (kept local so this is fully self‑contained)
 * ------------------------------------------------------------------ */
type PlayerRow = {
	id: string;
	player_name: string;
	singles_elo: number;
	doubles_elo: number;
	group_id?: string | null;
};

type MatchRow = {
	id: string;
	match_number: number;
	match_type: "singles" | "doubles";

	player_a1_id: string;
	player_b1_id: string;

	score_a: number;
	score_b: number;

	elo_before_a1: number | null;
	elo_before_b1: number | null;
	elo_change_a: number | null;
	elo_change_b: number | null;

	winner1?: string | null;
};

/* ------------------------------------------------------------------
 * Profile page – single component, clean data flow
 * ------------------------------------------------------------------ */
export default function Profile() {
	const { username } = useParams<{ username: string }>();
	const router = useRouter();

	const [player, setPlayer] = useState<PlayerRow | null>(null);
	const [matches, setMatches] = useState<MatchRow[]>([]);
	const [isAdmin, setIsAdmin] = useState(false);
	const [loading, setLoading] = useState(true);

	/* ------------------------------------------------------------------
	 * Load player + matches + admin status
	 * ------------------------------------------------------------------ */
	useEffect(() => {
		const load = async () => {
			setLoading(true);

			// 1. Player by username (this was broken before in your app)
			const { data: playerData } = await supabase
				.from("players")
				.select("*")
				.eq("player_name", username)
				.single();

			if (!playerData) {
				router.push("/");
				return;
			}

			setPlayer(playerData as PlayerRow);

			// 2. Matches involving this player (singles only for Elo graph)
			const { data: matchData } = await supabase
				.from("matches")
				.select("*")
				.eq("match_type", "singles")
				.or(
					`player_a1_id.eq.${playerData.id},player_b1_id.eq.${playerData.id}`
				)
				.order("match_number", { ascending: true });

			setMatches((matchData ?? []) as MatchRow[]);

			// 3. Admin check
			const session = await supabase.auth.getSession();
			if (session.data.session) {
				const { data } = await supabase
					.from("profiles")
					.select("is_admin")
					.eq("id", session.data.session.user.id)
					.single();

				setIsAdmin(Boolean(data?.is_admin));
			}

			setLoading(false);
		};

		load();
	}, [username, router]);

	/* ------------------------------------------------------------------
	 * Stats (merged ProfileStats)
	 * ------------------------------------------------------------------ */
	const stats = useMemo(() => {
		if (!player) return { wins: 0, losses: 0, ratio: "0.00" };

		let wins = 0;
		let losses = 0;

		for (const m of matches) {
			if (!m.winner1) continue;
			if (m.winner1 === player.id) wins++;
			else losses++;
		}

		return {
			wins,
			losses,
			ratio: wins + losses > 0 ? (wins / losses).toFixed(2) : "0.00",
		};
	}, [matches, player]);

	/* ------------------------------------------------------------------
	 * Elo history (merged EloChart logic)
	 * ------------------------------------------------------------------ */
	const eloHistory = useMemo(() => {
		if (!player) return [] as { match: number; elo: number }[];

		return matches
			.map((m) => {
				const isA = m.player_a1_id === player.id;
				const before = isA ? m.elo_before_a1 : m.elo_before_b1;
				const change = isA ? m.elo_change_a : m.elo_change_b;

				if (before == null || change == null) return null;

				return {
					match: m.match_number,
					elo: before + change,
				};
			})
			.filter(Boolean) as { match: number; elo: number }[];
	}, [matches, player]);

	if (loading || !player) return null;

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
				{isAdmin && (
					<Link
						href="/admin"
						className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700"
					>
						Admin Dashboard
					</Link>
				)}
			</section>

			{/* STATS */}
			<section className="grid grid-cols-3 gap-4 text-center">
				<Stat label="Wins" value={stats.wins} />
				<Stat label="Losses" value={stats.losses} />
				<Stat label="Win Ratio" value={stats.ratio} />
			</section>

			{/* ELO CHART */}
			<section className="bg-black/40 rounded-2xl p-6">
				<h2 className="text-xl font-semibold mb-4">Elo Over Time</h2>

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
 * Small local stat component
 * ------------------------------------------------------------------ */
function Stat({ label, value }: { label: string; value: number | string }) {
	return (
		<div className="bg-black/40 rounded-xl p-4">
			<p className="text-sm text-gray-400">{label}</p>
			<p className="text-2xl font-bold">{value}</p>
		</div>
	);
}
