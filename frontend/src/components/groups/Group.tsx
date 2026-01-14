"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import type { MatchesRow } from "@/types/database";

type Player = {
	id: string;
	player_name: string;
	claim_code: string | null;
};

type GroupData = {
	id: string;
	group_name: string;
	players: Player[];
	is_member: boolean;
	can_leave: boolean;
};

type ChartPoint = {
	x: number;
	date: string;
	matches: number;
};

export default function Group() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();

	const [group, setGroup] = useState<GroupData | null>(null);
	const [matches, setMatches] = useState<MatchesRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [matchType, setMatchType] = useState<"singles" | "doubles">(
		"singles"
	);
	const [range, setRange] = useState<number | null>(null); // days: 7, 30, null = all

	/* ---------- Load group ---------- */
	useEffect(() => {
		let cancelled = false;

		const loadGroup = async () => {
			setLoading(true);

			const { data, error } = await supabase
				.from("groups")
				.select("id, group_name, players(id, player_name, claim_code)")
				.eq("id", id)
				.single();

			if (error || !data) {
				router.push("/");
				return;
			}

			if (!cancelled) {
				const players: Player[] = (data.players ?? []).map((p) => ({
					id: p.id,
					player_name: p.player_name,
					claim_code: p.claim_code,
				}));

				setGroup({
					id: data.id,
					group_name: data.group_name,
					players,
					is_member: false,
					can_leave: false,
				});
				setLoading(false);
			}
		};

		loadGroup();
		return () => {
			cancelled = true;
		};
	}, [id, router]);

	/* ---------- Load group matches ---------- */
	useEffect(() => {
		if (!group) return;

		const loadMatches = async () => {
			const { data } = await supabase
				.from("matches")
				.select("*")
				.eq("group_id", group.id)
				.order("created_at", { ascending: true });

			setMatches((data ?? []) as MatchesRow[]);
		};

		loadMatches();
	}, [group]);

	/* ---------- Filter matches by type and range ---------- */
	const filteredMatches = useMemo(() => {
		let m = matches.filter((m) => m.match_type === matchType);

		if (range != null) {
			const cutoff = new Date();
			cutoff.setDate(cutoff.getDate() - range);
			m = m.filter((match) => new Date(match.created_at) >= cutoff);
		}

		return m;
	}, [matches, matchType, range]);

	/* ---------- Chart Data: Matches per day, equal width days ---------- */
	const chartData: ChartPoint[] = useMemo(() => {
		if (!filteredMatches.length) return [];

		// Group matches by day
		const matchesByDay: Record<string, MatchesRow[]> = {};
		filteredMatches.forEach((m) => {
			const day = new Date(m.created_at);
			const dayStr = `${day.getFullYear()}-${(day.getMonth() + 1)
				.toString()
				.padStart(2, "0")}-${day
				.getDate()
				.toString()
				.padStart(2, "0")}`;

			if (!matchesByDay[dayStr]) matchesByDay[dayStr] = [];
			matchesByDay[dayStr].push(m);
		});

		// Fill all days in range to ensure equal width spacing
		const firstDay = new Date(
			Math.min(
				...filteredMatches.map((m) => new Date(m.created_at).getTime())
			)
		);
		const lastDay = new Date(
			Math.max(
				...filteredMatches.map((m) => new Date(m.created_at).getTime())
			)
		);

		firstDay.setHours(0, 0, 0, 0);
		lastDay.setHours(0, 0, 0, 0);

		const dayArray: string[] = [];
		const current = new Date(firstDay);

		while (current <= lastDay) {
			const dayStr = `${current.getFullYear()}-${(current.getMonth() + 1)
				.toString()
				.padStart(2, "0")}-${current
				.getDate()
				.toString()
				.padStart(2, "0")}`;
			dayArray.push(dayStr);
			current.setDate(current.getDate() + 1);
		}

		return dayArray.map((day, index) => ({
			x: index,
			date: day,
			matches: matchesByDay[day]?.length ?? 0,
		}));
	}, [filteredMatches]);

	if (loading || !group) {
		return (
			<main className="max-w-5xl mx-auto px-4 py-16">
				<p className="text-center text-text-muted">Loading group…</p>
			</main>
		);
	}

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HEADER */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
					{group.group_name}
				</h1>
				<p className="text-text-muted">
					Players: {group.players.length}
				</p>
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

			{/* MATCHES PLAYED CHART */}
			<section>
				<ResponsiveContainer width="100%" height={280}>
					<LineChart
						data={chartData}
						margin={{ top: 10, right: 10, bottom: 30, left: 0 }}
					>
						<XAxis
							dataKey="x"
							type="number"
							tickFormatter={(x) => {
								const point = chartData[x];
								return point
									? new Date(point.date).toLocaleDateString(
											"en-GB",
											{
												month: "2-digit",
												day: "2-digit",
											}
									  )
									: "";
							}}
							tick={{ fill: "#aaa", fontSize: 12 }}
							axisLine={{ stroke: "#444" }}
							tickLine={{ stroke: "#444" }}
						/>
						<YAxis
							dataKey="matches"
							tick={{ fill: "#aaa", fontSize: 12 }}
							width={50}
							axisLine={{ stroke: "#444" }}
							tickLine={{ stroke: "#444" }}
							allowDecimals={false}
						/>
						<Tooltip
							content={({ payload }) =>
								payload?.length ? (
									<div className="bg-card px-3 py-2 rounded-lg text-sm">
										Matches Played: {payload[0].value}
									</div>
								) : null
							}
						/>
						<Area
							type="monotone"
							dataKey="matches"
							fill="rgba(79,70,229,0.25)"
							stroke="none"
						/>
						<Line
							type="monotone"
							dataKey="matches"
							stroke="#4f46e5"
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 4 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</section>
		</main>
	);
}
