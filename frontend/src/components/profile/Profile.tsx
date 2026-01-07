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
		const load = async () => {
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

		load();
	}, [username, router]);

	/* ---------- Load group ---------- */
	useEffect(() => {
		if (!player?.group_id) return;

		const load = async () => {
			const { data } = await supabase
				.from("groups")
				.select("group_name")
				.eq("id", player.group_id)
				.single();

			setGroupName(data?.group_name ?? null);
		};

		load();
	}, [player?.group_id]);

	/* ---------- Load matches ---------- */
	useEffect(() => {
		if (!player) return;

		const load = async () => {
			const { data } = await supabase
				.from("matches")
				.select("*")
				.or(
					`player_a1_id.eq.${player.id},player_a2_id.eq.${player.id},player_b1_id.eq.${player.id},player_b2_id.eq.${player.id}`
				)
				.order("created_at", { ascending: true });

			setMatches((data ?? []) as MatchesRow[]);
		};

		load();
	}, [player]);

	/* ---------- Range filter (PURE) ---------- */
	const filteredMatches = useMemo(() => {
		if (!range || matches.length === 0) return matches;

		const latest = Math.max(
			...matches.map((m) => new Date(m.created_at).getTime())
		);

		const cutoff = latest - range * 24 * 60 * 60 * 1000;

		return matches.filter(
			(m) => new Date(m.created_at).getTime() >= cutoff
		);
	}, [matches, range]);

	/* ---------- Stats ---------- */
	const stats = useMemo(() => {
		let wins = 0;
		let losses = 0;

		for (const m of filteredMatches) {
			const winners = [m.winner1, m.winner2].filter(Boolean);
			if (!winners.length) continue;
			if (player && winners.includes(player.id)) wins++;
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

	/* ---------- Elo history (daily, flat, filtered) ---------- */
	const eloHistory = useMemo(() => {
		if (!player) return [];

		const relevant = filteredMatches.filter(
			(m) => m.match_type === matchType
		);

		if (!relevant.length) return [];

		const eloAfter = (m: MatchesRow): number | null => {
			if (m.player_a1_id === player.id)
				return m.elo_before_a1 + m.elo_change_a;
			if (m.player_a2_id === player.id)
				return (m.elo_before_a2 ?? 0) + m.elo_change_a;
			if (m.player_b1_id === player.id)
				return m.elo_before_b1 + m.elo_change_b;
			if (m.player_b2_id === player.id)
				return (m.elo_before_b2 ?? 0) + m.elo_change_b;
			return null;
		};

		const sorted = [...relevant].sort(
			(a, b) =>
				new Date(a.created_at).getTime() -
				new Date(b.created_at).getTime()
		);

		const start = new Date(sorted[0].created_at);
		const end = new Date(sorted[sorted.length - 1].created_at);

		const data: { day: string; elo: number }[] = [];

		let currentElo: number | null = null;
		let i = 0;

		for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
			const dayKey = d.toISOString().split("T")[0];

			while (
				i < sorted.length &&
				new Date(sorted[i].created_at).toISOString().startsWith(dayKey)
			) {
				const e = eloAfter(sorted[i]);
				if (e != null) currentElo = e;
				i++;
			}

			if (currentElo != null) {
				data.push({ day: dayKey, elo: currentElo });
			}
		}

		return data;
	}, [filteredMatches, matchType, player]);

	const yDomain = useMemo(() => {
		if (!eloHistory.length) return [0, 2500];
		const elos = eloHistory.map((e) => e.elo);
		return [Math.min(...elos) - 50, Math.max(...elos) + 50];
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
						margin={{ left: 0, right: 0, top: 10 }}
					>
						<XAxis dataKey="day" hide />
						<YAxis domain={yDomain} width={40} />
						<Tooltip
							content={({ payload }) =>
								payload?.length ? (
									<div className="bg-card px-3 py-2 rounded-lg text-sm">
										Elo{" "}
										{Math.round(payload[0].value as number)}
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

			{/* MATCHES (full width, unchanged) */}
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
