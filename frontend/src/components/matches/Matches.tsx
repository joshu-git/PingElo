"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { supabase } from "@/lib/supabase";

// Determines how many matches are loaded in
const PAGE_SIZE = 50;

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
	elo_before_a2?: number;
	elo_before_b1: number;
	elo_before_b2?: number;
	elo_change_a: number;
	elo_change_b: number;
	winner1: string;
	winner2?: string;
	tournament_id?: string | null;
};

type Props = {
	variant?: "global" | "profile" | "admin";
	highlightPlayerId?: string;
};

export default function Matches({
	variant = "global",
	highlightPlayerId,
}: Props) {
	const router = useRouter();
	const loaderRef = useRef<HTMLDivElement | null>(null);

	const [matches, setMatches] = useState<MatchRow[]>([]);
	const [players, setPlayers] = useState<Map<string, string>>(new Map());
	const [tournaments, setTournaments] = useState<Map<string, string>>(
		new Map()
	);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(0);

	const [matchType, setMatchType] = useState<"singles" | "doubles">(
		"singles"
	);
	const [scope, setScope] = useState<"global" | "group">("global");
	const [groupId, setGroupId] = useState<string | null>(null);
	const [myGroupId, setMyGroupId] = useState<string | null>(null);

	/* ----------------------------------------
	 * Load all players and tournaments
	 * ---------------------------------------- */
	useEffect(() => {
		async function loadMeta() {
			const [playersData, tournamentsData, session] = await Promise.all([
				supabase.from("players").select("id, player_name, group_id"),
				supabase.from("tournaments").select("id, tournament_name"),
				supabase.auth.getSession(),
			]);

			if (playersData.data) {
				setPlayers(
					new Map(playersData.data.map((p) => [p.id, p.player_name]))
				);

				// Safe check for session
				const userId = session.data.session?.user?.id;
				if (userId) {
					const me = playersData.data.find((p) => p.id === userId);
					if (me?.group_id) setMyGroupId(me.group_id);
				}
			}

			if (tournamentsData.data) {
				setTournaments(
					new Map(
						tournamentsData.data.map((t) => [
							t.id,
							t.tournament_name,
						])
					)
				);
			}
		}

		loadMeta();
	}, []);

	/* ----------------------------------------
	 * Load matches (paginated)
	 * ---------------------------------------- */
	const loadMore = useCallback(
		async (reset = false) => {
			if (loading || !hasMore) return;
			setLoading(true);

			const currentPage = reset ? 0 : page;
			let query = supabase
				.from("matches")
				.select("*")
				.order("created_at", { ascending: false })
				.range(
					currentPage * PAGE_SIZE,
					currentPage * PAGE_SIZE + PAGE_SIZE - 1
				);

			// Filter for profile
			if (variant === "profile" && highlightPlayerId) {
				query = query.or(
					`player_a1_id.eq.${highlightPlayerId},player_a2_id.eq.${highlightPlayerId},player_b1_id.eq.${highlightPlayerId},player_b2_id.eq.${highlightPlayerId}`
				);
			}

			// Filter for group scope
			if (scope === "group" && groupId) {
				// You might need to join players table for group filtering in supabase
				// For simplicity, we load all and filter client-side
			}

			const { data, error } = await query;
			if (!error && data) {
				setMatches((prev) => (reset ? data : [...prev, ...data]));
				setHasMore(data.length === PAGE_SIZE);
				if (reset) setPage(1);
				else setPage((p) => p + 1);
			} else if (error) {
				console.error(error);
			}

			setLoading(false);
		},
		[loading, page, hasMore, variant, highlightPlayerId, scope, groupId]
	);

	/* Reload on filter or matchType change */
	useEffect(() => {
		const reload = async () => {
			await loadMore(true);
		};
		reload();
	}, [matchType, scope, groupId, loadMore]);

	/* Infinite scroll */
	useEffect(() => {
		const el = loaderRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => entry.isIntersecting && loadMore(),
			{ threshold: 1 }
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [loadMore]);

	/* ----------------------------------------
	 * UI helpers
	 * ---------------------------------------- */
	function outline(playerId: string, winnerId: string) {
		if (variant !== "profile" || !highlightPlayerId)
			return "border-white/10";
		if (highlightPlayerId !== playerId) return "border-white/10";
		return highlightPlayerId === winnerId
			? "border-green-500/30"
			: "border-red-500/30";
	}

	const getPlayerName = (id?: string | null) =>
		id ? players.get(id) ?? "Unknown" : "—";
	const getTournamentName = (id?: string | null) =>
		id ? tournaments.get(id) ?? "Unknown Tournament" : null;

	/* ----------------------------------------
	 * Render
	 * ---------------------------------------- */
	return (
		<div className="w-full flex justify-center px-4 mt-12">
			<div className="w-full max-w-2xl space-y-6">
				{/* Header + Filters */}
				<div className="flex flex-col sm:flex-row justify-between items-center gap-4">
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">
						Matches
					</h1>

					<div className="flex flex-wrap gap-2">
						{/* Match type */}
						<button
							className={clsx(
								"px-4 py-2 rounded-lg",
								matchType === "singles" &&
									"font-semibold underline"
							)}
							onClick={() => setMatchType("singles")}
						>
							Singles
						</button>
						<button
							className={clsx(
								"px-4 py-2 rounded-lg",
								matchType === "doubles" &&
									"font-semibold underline"
							)}
							onClick={() => setMatchType("doubles")}
						>
							Doubles
						</button>

						{/* Scope / group */}
						<select
							value={groupId ?? ""}
							onChange={(e) => {
								setScope("group");
								setGroupId(e.target.value || null);
							}}
							className="px-4 py-2 rounded-lg border border-border bg-transparent text-text"
						>
							<option value="">Select Group</option>
							{/* Populate with groups if loaded */}
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

					<Link href="/matches/submit">
						<button className="px-4 py-2 rounded-lg w-full sm:w-auto">
							Submit Match
						</button>
					</Link>
				</div>

				{/* Matches */}
				<div className="space-y-4">
					{matches.map((m) => {
						const a1 = getPlayerName(m.player_a1_id);
						const a2 =
							matchType === "doubles"
								? getPlayerName(m.player_a2_id)
								: null;
						const b1 = getPlayerName(m.player_b1_id);
						const b2 =
							matchType === "doubles"
								? getPlayerName(m.player_b2_id)
								: null;

						const aEloAfter = m.elo_before_a1 + m.elo_change_a;
						const bEloAfter = m.elo_before_b1 + m.elo_change_b;

						const tournamentName = getTournamentName(
							m.tournament_id
						);

						return (
							<div
								key={m.id}
								onClick={() => router.push(`/matches/${m.id}`)}
								className={clsx(
									"bg-card p-5 rounded-xl cursor-pointer hover-card transition",
									outline(m.player_a1_id, m.winner1),
									outline(m.player_b1_id, m.winner1)
								)}
							>
								<div className="flex flex-col sm:flex-row gap-5 sm:items-center sm:justify-between">
									{/* Players + Elo */}
									<div className="flex flex-col gap-2 flex-1 min-w-0">
										{/* Team A */}
										<div className="flex justify-between items-center">
											<span className="font-medium truncate">
												{a1} {a2 ? `& ${a2}` : ""}
												{tournamentName && (
													<span className="text-xs text-text-subtle ml-2">
														({tournamentName})
													</span>
												)}
											</span>
											<span className="text-sm text-text-subtle w-14 text-right">
												{m.elo_change_a > 0 && "+"}
												{m.elo_change_a}
											</span>
										</div>

										{/* Team B */}
										<div className="flex justify-between items-center">
											<span className="font-medium truncate">
												{b1} {b2 ? `& ${b2}` : ""}
											</span>
											<span className="text-sm text-text-subtle w-14 text-right">
												{m.elo_change_b > 0 && "+"}
												{m.elo_change_b}
											</span>
										</div>
									</div>

									{/* Scores */}
									<div className="flex sm:flex-col justify-center items-center gap-3 font-semibold text-lg">
										<span>{m.score_a}</span>
										<span className="text-text-muted">
											{m.score_b}
										</span>
									</div>

									{/* Meta */}
									<div className="text-sm text-text-subtle text-left sm:text-right">
										<div className="font-medium text-text">
											Winner:{" "}
											{matchType === "singles"
												? getPlayerName(m.winner1)
												: `${getPlayerName(
														m.winner1
												  )} & ${getPlayerName(
														m.winner2
												  )}`}
										</div>
										<div>
											{new Date(
												m.created_at
											).toLocaleDateString()}
										</div>
									</div>
								</div>
							</div>
						);
					})}

					{/* Loader */}
					<div
						ref={loaderRef}
						className="h-12 flex justify-center items-center"
					>
						{loading && (
							<span className="text-text-muted">Loading…</span>
						)}
						{!hasMore && !loading && (
							<span className="text-text-subtle text-sm">
								No more matches
							</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
