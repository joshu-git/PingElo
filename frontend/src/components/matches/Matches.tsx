"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { supabase } from "@/lib/supabase";

type MatchRow = {
	id: string;
	created_at: string;
	player_a1_id: string;
	player_a2_id?: string;
	player_b1_id: string;
	player_b2_id?: string;
	score_a: number;
	score_b: number;
	elo_before_a1: number;
	elo_before_a2?: number;
	elo_before_b1: number;
	elo_before_b2?: number;
	elo_change_a: number;
	elo_change_b: number;
	winner1: string;
	winner2?: string;
	match_type: "singles" | "doubles";
	tournament_id?: string | null;
};

type Group = {
	id: string;
	group_name: string;
};

export default function Matches() {
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

	const PAGE_SIZE = 50;

	/* ---------------------------
	 * Load all players + groups
	 * --------------------------- */
	useEffect(() => {
		const loadMeta = async () => {
			const [{ data: playerData }, { data: groupData }, sessionRes] =
				await Promise.all([
					supabase
						.from("players")
						.select("id, player_name, group_id"),
					supabase.from("groups").select("*").order("group_name"),
					supabase.auth.getSession(),
				]);

			if (playerData)
				setPlayers(
					new Map(playerData.map((p) => [p.id, p.player_name]))
				);
			if (groupData) {
				setGroups(groupData);
				setGroupMap(
					new Map(groupData.map((g) => [g.id, g.group_name]))
				);
			}

			const session = sessionRes.data.session;
			if (session) {
				const me = playerData?.find((p) => p.id === session.user.id);
				if (me?.group_id) setMyGroupId(me.group_id);
			}
		};

		loadMeta();
	}, []);

	/* ---------------------------
	 * Load matches (paginated)
	 * --------------------------- */
	const loadMatches = useCallback(
		async (reset: boolean) => {
			if (loading) return;
			setLoading(true);

			const currentPage = reset ? 0 : page;
			let query = supabase
				.from("matches")
				.select(
					`
					id,
					created_at,
					player_a1_id,
					player_a2_id,
					player_b1_id,
					player_b2_id,
					score_a,
					score_b,
					elo_before_a1,
					elo_before_a2,
					elo_before_b1,
					elo_before_b2,
					elo_change_a,
					elo_change_b,
					winner1,
					winner2,
					match_type,
					tournament_id
				`
				)
				.eq("match_type", matchType)
				.order("created_at", { ascending: false })
				.range(
					currentPage * PAGE_SIZE,
					currentPage * PAGE_SIZE + PAGE_SIZE - 1
				);

			if (scope === "group" && groupId) {
				query = query.or(
					`player_a1_id.in.(select id from players where group_id='${groupId}'),player_b1_id.in.(select id from players where group_id='${groupId}')`
				);
			}

			const { data, error } = await query;
			if (!error && data) {
				setMatches((prev) => (reset ? data : [...prev, ...data]));
				setHasMore(data.length === PAGE_SIZE);
				if (reset) setPage(1);
			}
			setLoading(false);
		},
		[matchType, scope, groupId, page, loading]
	);

	useEffect(() => {
		loadMatches(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [matchType, scope, groupId]);

	/* ---------------------------
	 * Infinite scroll
	 * --------------------------- */
	useEffect(() => {
		if (!hasMore || loading) return;
		const el = loaderRef.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => entry.isIntersecting && loadMatches(false),
			{ threshold: 1 }
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, [hasMore, loading, loadMatches]);

	/* ---------------------------
	 * Helper: Elo After
	 * --------------------------- */
	const eloAfter = (before?: number, change?: number) =>
		before !== undefined && change !== undefined
			? before + change
			: undefined;

	/* ---------------------------
	 * Render
	 * --------------------------- */
	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HERO */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
					Matches
				</h1>
				<p className="text-lg max-w-2xl mx-auto text-text-muted">
					See all submitted matches with Elo changes and tournament
					info.
				</p>
			</section>

			{/* FILTERS */}
			<div className="flex flex-col gap-2 sm:gap-4">
				<div className="flex flex-wrap justify-center gap-2">
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

				<div className="flex flex-wrap justify-center gap-2">
					<select
						value={groupId ?? ""}
						onChange={(e) => {
							setScope("group");
							setGroupId(e.target.value || null);
						}}
						className="px-4 py-2 rounded-lg border border-border bg-transparent text-text"
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
						className="px-4 py-2 rounded-lg disabled:opacity-50"
					>
						My Group
					</button>
					<button
						onClick={() => {
							setScope("global");
							setGroupId(null);
						}}
						className="px-4 py-2 rounded-lg"
					>
						Global
					</button>
				</div>
			</div>

			{/* MATCH LIST */}
			<div className="space-y-6">
				{matches.map((m) => {
					const teamA = [m.player_a1_id, m.player_a2_id].filter(
						Boolean
					) as string[];
					const teamB = [m.player_b1_id, m.player_b2_id].filter(
						Boolean
					) as string[];

					const teamAElo = [
						eloAfter(m.elo_before_a1, m.elo_change_a),
						eloAfter(m.elo_before_a2, m.elo_change_a),
					].filter(Boolean);

					const teamBElo = [
						eloAfter(m.elo_before_b1, m.elo_change_b),
						eloAfter(m.elo_before_b2, m.elo_change_b),
					].filter(Boolean);

					const tournamentName = m.tournament_id
						? groupMap.get(m.tournament_id)
						: null;

					return (
						<div
							key={m.id}
							onClick={() => router.push(`/matches/${m.id}`)}
							className="bg-card p-5 rounded-xl hover-card transition cursor-pointer"
						>
							<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
								{/* Teams */}
								<div className="flex flex-col gap-2 flex-1 min-w-0">
									{/* Team A */}
									<div className="flex justify-between items-center">
										<div className="flex flex-wrap gap-2">
											{teamA.map((p, idx) => (
												<Link
													key={p}
													href={`/profile/${
														players.get(p) ??
														"Unknown"
													}`}
													onClick={(e) =>
														e.stopPropagation()
													}
													className="font-medium hover:underline"
												>
													{players.get(p) ??
														"Unknown"}
													{teamAElo[idx] !==
														undefined && (
														<span className="ml-1 text-text-subtle font-normal">
															({teamAElo[idx]})
														</span>
													)}
												</Link>
											))}
										</div>
										<div className="flex items-center gap-2 text-text-subtle text-sm min-w-max">
											<span
												className={
													m.elo_change_a > 0
														? "text-green-500"
														: "text-red-500"
												}
											>
												{m.elo_change_a > 0 && "+"}
												{m.elo_change_a}
											</span>
											<span className="font-semibold">
												{m.score_a}
											</span>
										</div>
									</div>

									{/* Team B */}
									<div className="flex justify-between items-center">
										<div className="flex flex-wrap gap-2">
											{teamB.map((p, idx) => (
												<Link
													key={p}
													href={`/profile/${
														players.get(p) ??
														"Unknown"
													}`}
													onClick={(e) =>
														e.stopPropagation()
													}
													className="font-medium hover:underline"
												>
													{players.get(p) ??
														"Unknown"}
													{teamBElo[idx] !==
														undefined && (
														<span className="ml-1 text-text-subtle font-normal">
															({teamBElo[idx]})
														</span>
													)}
												</Link>
											))}
										</div>
										<div className="flex items-center gap-2 text-text-subtle text-sm min-w-max">
											<span
												className={
													m.elo_change_b > 0
														? "text-green-500"
														: "text-red-500"
												}
											>
												{m.elo_change_b > 0 && "+"}
												{m.elo_change_b}
											</span>
											<span className="font-semibold">
												{m.score_b}
											</span>
										</div>
									</div>
								</div>

								{/* Meta info */}
								<div className="flex flex-col text-sm text-text-subtle gap-1 min-w-max">
									<span>
										Winner:{" "}
										{teamA.includes(m.winner1)
											? "Team A"
											: "Team B"}
									</span>
									<span>
										{new Date(
											m.created_at
										).toLocaleDateString()}
									</span>
									{tournamentName && (
										<span>
											Tournament: {tournamentName}
										</span>
									)}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Loader */}
			<div
				ref={loaderRef}
				className="h-12 flex justify-center items-center"
			>
				{loading && <span className="text-text-muted">Loading…</span>}
				{!hasMore && !loading && (
					<span className="text-text-subtle text-sm">
						No more matches
					</span>
				)}
			</div>
		</main>
	);
}
