"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { supabase } from "@/lib/supabase";

type MatchRow = {
	id: string;
	created_at: string;
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
	winner1: string;
	winner2?: string | null;
	match_type: "singles" | "doubles";
	tournament_id?: string | null;
};

type Player = {
	id: string;
	player_name: string;
	group_id?: string | null;
};

type Group = {
	id: string;
	group_name: string;
};

const PAGE_SIZE = 30;

export default function Matches({
	profilePlayerId,
}: {
	profilePlayerId?: string;
}) {
	const router = useRouter();
	const loaderRef = useRef<HTMLDivElement | null>(null);

	const [matches, setMatches] = useState<MatchRow[]>([]);
	const [players, setPlayers] = useState<Map<string, string>>(new Map());
	const [groups, setGroups] = useState<Group[]>([]);
	const [groupMap, setGroupMap] = useState<Map<string, string>>(new Map());

	const [matchType, setMatchType] = useState<"singles" | "doubles">(
		"singles"
	);
	const [scope, setScope] = useState<"global" | "group">("global");
	const [groupId, setGroupId] = useState<string | null>(null);
	const [myGroupId, setMyGroupId] = useState<string | null>(null);

	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const [loading, setLoading] = useState(false);

	/* -------------------------
	 * Load players & groups
	 * ------------------------- */
	useEffect(() => {
		(async () => {
			const [{ data: playerData }, { data: groupData }, sessionRes] =
				await Promise.all([
					supabase
						.from("players")
						.select("id, player_name, group_id"),
					supabase.from("groups").select("*").order("group_name"),
					supabase.auth.getSession(),
				]);

			if (playerData) {
				setPlayers(
					new Map(
						(playerData as Player[]).map((p) => [
							p.id,
							p.player_name,
						])
					)
				);

				const session = sessionRes.data.session;
				if (session) {
					const me = playerData.find((p) => p.id === session.user.id);
					if (me?.group_id) setMyGroupId(me.group_id);
				}
			}

			if (groupData) {
				setGroups(groupData as Group[]);
				setGroupMap(
					new Map(
						(groupData as Group[]).map((g) => [g.id, g.group_name])
					)
				);
			}
		})();
	}, []);

	/* -------------------------
	 * Load matches
	 * ------------------------- */
	const loadMatches = useCallback(
		async (reset = false) => {
			if (loading) return;

			setLoading(true);
			const nextPage = reset ? 0 : page;

			let query = supabase
				.from("matches")
				.select("*")
				.eq("match_type", matchType)
				.order("created_at", { ascending: false })
				.range(
					nextPage * PAGE_SIZE,
					nextPage * PAGE_SIZE + PAGE_SIZE - 1
				);

			if (profilePlayerId) {
				query = query.or(
					`player_a1_id.eq.${profilePlayerId},player_a2_id.eq.${profilePlayerId},player_b1_id.eq.${profilePlayerId},player_b2_id.eq.${profilePlayerId}`
				);
			}

			if (scope === "group" && groupId) {
				const { data: groupPlayers } = await supabase
					.from("players")
					.select("id")
					.eq("group_id", groupId);

				const ids = (groupPlayers ?? []).map((p) => p.id);
				if (ids.length) {
					query = query.or(
						`player_a1_id.in.(${ids.join(
							","
						)}),player_b1_id.in.(${ids.join(",")})`
					);
				}
			}

			const { data } = await query;
			const rows = (data ?? []) as MatchRow[];

			setMatches((prev) => (reset ? rows : [...prev, ...rows]));
			setHasMore(rows.length === PAGE_SIZE);
			setPage(nextPage + 1);
			setLoading(false);
		},
		[matchType, scope, groupId, profilePlayerId, page, loading]
	);

	/* Initial + filter reload */
	useEffect(() => {
		loadMatches(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [matchType, scope, groupId, profilePlayerId]);

	/* -------------------------
	 * Infinite scroll
	 * ------------------------- */
	useEffect(() => {
		if (!loaderRef.current || !hasMore || loading) return;

		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) loadMatches();
		});

		observer.observe(loaderRef.current);
		return () => observer.disconnect();
	}, [loadMatches, hasMore, loading]);

	const eloAfter = (before?: number | null, change?: number | null) =>
		before != null && change != null ? before + change : null;

	/* -------------------------
	 * Render
	 * ------------------------- */
	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HERO */}
			<section className="text-center space-y-3">
				<h1 className="text-4xl font-extrabold">Matches</h1>
				<p className="text-text-muted">
					All matches with Elo changes and tournaments
				</p>
			</section>

			{/* FILTERS (Leaderboard-style) */}
			<div className="flex flex-col gap-3">
				<div className="flex justify-center gap-2">
					<button
						onClick={() => setMatchType("singles")}
						className={clsx(
							"px-4 py-2 rounded-lg",
							matchType === "singles" && "font-semibold underline"
						)}
					>
						Singles
					</button>
					<button
						onClick={() => setMatchType("doubles")}
						className={clsx(
							"px-4 py-2 rounded-lg",
							matchType === "doubles" && "font-semibold underline"
						)}
					>
						Doubles
					</button>
					<Link href="/matches/submit">
						<button className="px-4 py-2 rounded-lg">
							Submit Match
						</button>
					</Link>
				</div>

				<div className="flex justify-center gap-2 flex-wrap">
					<select
						value={groupId ?? ""}
						onChange={(e) => {
							setScope("group");
							setGroupId(e.target.value || null);
						}}
						className="px-3 py-2 rounded-lg border"
					>
						<option value="">Select Group</option>
						{groups.map((g) => (
							<option key={g.id} value={g.id}>
								{g.group_name}
							</option>
						))}
					</select>

					<button
						disabled={!myGroupId}
						onClick={() => {
							setScope("group");
							setGroupId(myGroupId);
						}}
						className="px-3 py-2 rounded-lg disabled:opacity-50"
					>
						My Group
					</button>

					<button
						onClick={() => {
							setScope("global");
							setGroupId(null);
						}}
						className="px-3 py-2 rounded-lg"
					>
						Global
					</button>
				</div>
			</div>

			{/* MATCH LIST */}
			<div className="space-y-5">
				{matches.map((m) => {
					const teamA = [m.player_a1_id, m.player_a2_id].filter(
						Boolean
					) as string[];
					const teamB = [m.player_b1_id, m.player_b2_id].filter(
						Boolean
					) as string[];

					const winner = m.score_a > m.score_b ? "Team A" : "Team B";

					return (
						<div
							key={m.id}
							onClick={() => router.push(`/matches/${m.id}`)}
							className="bg-card p-5 rounded-xl hover-card cursor-pointer"
						>
							<div className="flex justify-between gap-6">
								<div className="flex-1 space-y-2">
									<div className="flex justify-between">
										<span>
											{teamA.map((id, i) => (
												<span key={id}>
													{players.get(id)}{" "}
													{eloAfter(
														i === 0
															? m.elo_before_a1
															: m.elo_before_a2,
														m.elo_change_a
													) && (
														<span className="text-text-subtle">
															(
															{eloAfter(
																i === 0
																	? m.elo_before_a1
																	: m.elo_before_a2,
																m.elo_change_a
															)}
															)
														</span>
													)}{" "}
												</span>
											))}
										</span>
										<span className="text-sm">
											{m.elo_change_a >= 0 && "+"}
											{m.elo_change_a} · {m.score_a}
										</span>
									</div>

									<div className="flex justify-between">
										<span>
											{teamB.map((id, i) => (
												<span key={id}>
													{players.get(id)}{" "}
													{eloAfter(
														i === 0
															? m.elo_before_b1
															: m.elo_before_b2,
														m.elo_change_b
													) && (
														<span className="text-text-subtle">
															(
															{eloAfter(
																i === 0
																	? m.elo_before_b1
																	: m.elo_before_b2,
																m.elo_change_b
															)}
															)
														</span>
													)}{" "}
												</span>
											))}
										</span>
										<span className="text-sm">
											{m.elo_change_b >= 0 && "+"}
											{m.elo_change_b} · {m.score_b}
										</span>
									</div>
								</div>

								<div className="text-sm text-text-subtle text-right">
									<div>{winner}</div>
									<div>
										{new Date(
											m.created_at
										).toLocaleDateString()}
									</div>
									{m.tournament_id && (
										<div>
											{groupMap.get(m.tournament_id)}
										</div>
									)}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			<div ref={loaderRef} className="h-10" />
		</main>
	);
}
