"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type MatchType = "singles" | "doubles";

type MatchRow = {
	id: string;
	created_at: string;
	match_type: MatchType;

	player_a1_id: string;
	player_a2_id?: string | null;
	player_b1_id: string;
	player_b2_id?: string | null;

	score_a: number;
	score_b: number;

	elo_before_a1: number;
	elo_before_a2?: number | null;
	elo_before_b1: number;
	elo_before_b2?: number | null;

	elo_change_a: number;
	elo_change_b: number;

	tournament_id?: string | null;
};

type PlayerRow = {
	id: string;
	player_name: string;
};

const PAGE_SIZE = 30;

export default function Matches({
	profilePlayerId,
	matchType,
	onMatchTypeChange,
}: {
	profilePlayerId?: string;
	matchType: MatchType;
	onMatchTypeChange?: (t: MatchType) => void;
}) {
	const router = useRouter();

	const [matches, setMatches] = useState<MatchRow[]>([]);
	const [players, setPlayers] = useState<Map<string, PlayerRow>>(new Map());
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const [loading, setLoading] = useState(false);

	/* ---------- Load players ---------- */
	useEffect(() => {
		supabase
			.from("players")
			.select("id, player_name")
			.then(({ data }) => {
				if (data) {
					setPlayers(new Map(data.map((p: PlayerRow) => [p.id, p])));
				}
			});
	}, []);

	/* ---------- Load matches ---------- */
	const loadMatches = useCallback(
		async (reset: boolean) => {
			if (loading) return;
			setLoading(true);

			const currentPage = reset ? 0 : page;

			let query = supabase
				.from("matches")
				.select("*")
				.eq("match_type", matchType)
				.order("created_at", { ascending: false })
				.range(
					currentPage * PAGE_SIZE,
					currentPage * PAGE_SIZE + PAGE_SIZE - 1
				);

			if (profilePlayerId) {
				query = query.or(
					`player_a1_id.eq.${profilePlayerId},player_a2_id.eq.${profilePlayerId},player_b1_id.eq.${profilePlayerId},player_b2_id.eq.${profilePlayerId}`
				);
			}

			const { data } = await query;
			const rows = (data ?? []) as MatchRow[];

			setMatches((prev) => (reset ? rows : [...prev, ...rows]));
			setHasMore(rows.length === PAGE_SIZE);
			if (reset) setPage(1);

			setLoading(false);
		},
		[loading, page, matchType, profilePlayerId]
	);

	useEffect(() => {
		loadMatches(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [matchType, profilePlayerId]);

	/* ---------- Infinite scroll ---------- */
	useEffect(() => {
		if (!hasMore || loading) return;

		const onScroll = () => {
			if (
				window.innerHeight + window.scrollY >=
				document.body.offsetHeight - 300
			) {
				loadMatches(false);
				setPage((p) => p + 1);
			}
		};

		window.addEventListener("scroll", onScroll);
		return () => window.removeEventListener("scroll", onScroll);
	}, [hasMore, loading, loadMatches]);

	const eloAfter = (before?: number | null, change?: number | null) =>
		before != null && change != null ? before + change : null;

	return (
		<section className="space-y-6">
			{/* Match type toggle (only when allowed) */}
			{onMatchTypeChange && (
				<div className="flex justify-center gap-2">
					{(["singles", "doubles"] as MatchType[]).map((t) => (
						<button
							key={t}
							onClick={() => onMatchTypeChange(t)}
							className={`px-4 py-2 rounded-lg ${
								matchType === t ? "font-semibold underline" : ""
							}`}
						>
							{t === "singles" ? "Singles" : "Doubles"}
						</button>
					))}
				</div>
			)}

			{/* Matches */}
			<div className="space-y-3">
				{matches.map((m) => {
					const teamAWon = m.score_a > m.score_b;

					const isProfileOnA =
						profilePlayerId &&
						[m.player_a1_id, m.player_a2_id].includes(
							profilePlayerId
						);

					const profileWon =
						profilePlayerId &&
						(isProfileOnA ? teamAWon : !teamAWon);

					const Badge = profileWon ? (
						<span className="px-2 py-0.5 text-xs rounded-md bg-border">
							WIN
						</span>
					) : (
						<span className="px-2 py-0.5 text-xs rounded-md border border-border">
							LOSS
						</span>
					);

					return (
						<div
							key={m.id}
							onClick={() => router.push(`/match/${m.id}`)}
							className="bg-card p-4 rounded-xl hover-card cursor-pointer"
						>
							<div className="flex justify-between gap-6">
								<div className="flex-1 space-y-2">
									{/* Team A */}
									<div className="flex justify-between">
										<div>
											{
												players.get(m.player_a1_id)
													?.player_name
											}
										</div>
										<div className="flex items-center gap-2">
											<span className="font-semibold">
												{m.score_a}
											</span>
											{isProfileOnA && Badge}
										</div>
									</div>

									{/* Team B */}
									<div className="flex justify-between">
										<div>
											{
												players.get(m.player_b1_id)
													?.player_name
											}
										</div>
										<div className="flex items-center gap-2">
											<span className="font-semibold">
												{m.score_b}
											</span>
											{!isProfileOnA && Badge}
										</div>
									</div>
								</div>

								<div className="text-sm text-text-muted text-right">
									<div>
										{new Date(
											m.created_at
										).toLocaleDateString()}
									</div>
									{m.tournament_id && (
										<div className="mt-1 text-xs px-2 py-0.5 rounded-md bg-border inline-block">
											Tournament
										</div>
									)}
								</div>
							</div>
						</div>
					);
				})}

				{loading && (
					<p className="text-center text-text-muted">Loading…</p>
				)}
			</div>
		</section>
	);
}
