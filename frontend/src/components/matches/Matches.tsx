"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
	group_id?: string | null;
};

type GroupRow = {
	id: string;
	group_name: string;
};

const PAGE_SIZE = 50;

export default function Matches({
	matchType: controlledMatchType,
}: {
	matchType?: MatchType;
}) {
	const router = useRouter();

	const [matches, setMatches] = useState<MatchRow[]>([]);
	const [playersData, setPlayersData] = useState<PlayerRow[]>([]);
	const [groups, setGroups] = useState<GroupRow[]>([]);

	const [localMatchType, setLocalMatchType] = useState<MatchType>("singles");
	const matchType = controlledMatchType ?? localMatchType;

	const [scope, setScope] = useState<"global" | "group">("global");
	const [groupId, setGroupId] = useState<string | null>(null);
	const [myGroupId, setMyGroupId] = useState<string | null>(null);

	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);

	const lastCursor = useRef<{ created_at: string; id: string } | null>(null);

	const players = useMemo(
		() => new Map(playersData.map((p) => [p.id, p])),
		[playersData]
	);

	const eloAfter = (
		before: number | null | undefined,
		change: number | null | undefined
	) => (before != null && change != null ? before + change : null);

	const buildTeam = (
		p1: string,
		before1: number,
		p2?: string | null,
		before2?: number | null
	): { id: string; before: number | null }[] => {
		const arr: { id: string; before: number | null }[] = [
			{ id: p1, before: before1 ?? null },
		];
		if (p2) arr.push({ id: p2, before: before2 ?? null });
		return arr;
	};

	/* -------------------- Load meta -------------------- */
	useEffect(() => {
		(async () => {
			const [{ data: playerData }, { data: groupData }, session] =
				await Promise.all([
					supabase.from("players").select("id, player_name"),
					supabase.from("groups").select("*").order("group_name"),
					supabase.auth.getSession(),
				]);

			if (playerData) setPlayersData(playerData as PlayerRow[]);
			if (groupData) setGroups(groupData as GroupRow[]);
			if (session.data.session) {
				const { data: me } = await supabase
					.from("players")
					.select("group_id")
					.eq("account_id", session.data.session.user.id)
					.maybeSingle();
				if (me?.group_id) setMyGroupId(me.group_id);
			}
		})();
	}, []);

	/* -------------------- Load matches (cursor-based) -------------------- */
	const loadMatches = useCallback(
		async (reset = false) => {
			if (loading || (!hasMore && !reset)) return;
			setLoading(true);

			if (reset) lastCursor.current = null;

			let query = supabase
				.from("matches")
				.select("*")
				.eq("match_type", matchType)
				.order("created_at", { ascending: false })
				.order("id", { ascending: false })
				.limit(PAGE_SIZE);

			if (lastCursor.current && !reset) {
				query = query
					.lt("created_at", lastCursor.current.created_at)
					.or(
						`created_at.eq.${lastCursor.current.created_at},id.lt.${lastCursor.current.id}`
					);
			}

			if (scope === "group" && groupId) {
				const groupPlayerIds = playersData
					.filter((p) => p.group_id === groupId)
					.map((p) => p.id);
				if (groupPlayerIds.length)
					query = query.or(
						`player_a1_id.in.(${groupPlayerIds.join(",")}),player_b1_id.in.(${groupPlayerIds.join(",")})`
					);
			}

			const { data } = await query;
			const rows = (data ?? []) as MatchRow[];

			if (rows.length < PAGE_SIZE) setHasMore(false);
			if (rows.length) {
				lastCursor.current = {
					created_at: rows[rows.length - 1].created_at,
					id: rows[rows.length - 1].id,
				};
			}

			setMatches((prev) => (reset ? rows : [...prev, ...rows]));
			setLoading(false);
		},
		[matchType, scope, groupId, loading, hasMore, playersData]
	);

	/* -------------------- Reset matches when filter changes -------------------- */
	useEffect(() => {
		(async () => {
			await loadMatches(true);
		})();
	}, [matchType, scope, groupId, loadMatches]);

	/* -------------------- Infinite scroll -------------------- */
	useEffect(() => {
		let ticking = false;

		const onScroll = () => {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(() => {
				if (
					!loading &&
					hasMore &&
					window.innerHeight + window.scrollY >=
						document.body.offsetHeight - 300
				) {
					loadMatches(false);
				}
				ticking = false;
			});
		};

		window.addEventListener("scroll", onScroll);
		return () => window.removeEventListener("scroll", onScroll);
	}, [loading, hasMore, loadMatches]);

	/* -------------------- Render -------------------- */
	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HEADER */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">Matches</h1>
				<p className="text-text-muted">
					Match history with Elo changes.
				</p>
			</section>

			{/* CONTROLS */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-wrap justify-center gap-2">
					<button
						onClick={() => setLocalMatchType("singles")}
						className={`px-4 py-2 rounded-lg ${matchType === "singles" ? "font-semibold underline" : ""}`}
					>
						Singles
					</button>
					<button
						onClick={() => setLocalMatchType("doubles")}
						className={`px-4 py-2 rounded-lg ${matchType === "doubles" ? "font-semibold underline" : ""}`}
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
						className="px-4 py-2 rounded-lg border border-border bg-transparent"
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

			{/* MATCH CARDS */}
			<section className="space-y-3">
				{matches.map((m) => {
					const teamA = buildTeam(
						m.player_a1_id,
						m.elo_before_a1,
						m.player_a2_id,
						m.elo_before_a2
					);
					const teamB = buildTeam(
						m.player_b1_id,
						m.elo_before_b1,
						m.player_b2_id,
						m.elo_before_b2
					);
					const teamAWon = m.score_a > m.score_b;
					const dateString = new Date(
						m.created_at
					).toLocaleDateString();

					const nameSizeClass =
						matchType === "singles"
							? "text-[clamp(0.85rem,4vw,1rem)]"
							: "text-[clamp(0.75rem,2.5vw,1rem)]";
					const eloSizeClass =
						matchType === "singles"
							? "text-[clamp(0.7rem,3vw,0.85rem)]"
							: "text-[clamp(0.65rem,2vw,0.85rem)]";

					return (
						<div
							key={m.id}
							onClick={() => router.push(`/matches/${m.id}`)}
							className="bg-card p-4 rounded-xl hover-card cursor-pointer"
						>
							<div className="flex justify-between gap-6">
								{/* Teams */}
								<div className="flex-1 space-y-3">
									{[teamA, teamB].map((team, idx) => (
										<div
											key={idx}
											className="flex justify-between items-center"
										>
											<div
												className={`flex gap-1 whitespace-nowrap ${nameSizeClass}`}
											>
												{team.map((p, i) => (
													<span
														key={p.id}
														className="flex items-center gap-1"
													>
														<Link
															href={`/profile/${players.get(p.id)?.player_name ?? p.id}`}
															onClick={(e) =>
																e.stopPropagation()
															}
															className="hover:underline cursor-pointer"
														>
															{players.get(p.id)
																?.player_name ??
																p.id}
														</Link>
														<span
															className={`${eloSizeClass} text-text-subtle`}
														>
															(
															{eloAfter(
																p.before,
																idx === 0
																	? m.elo_change_a
																	: m.elo_change_b
															) ?? "—"}
															)
														</span>
														{i === 0 &&
															team.length > 1 &&
															" & "}
													</span>
												))}
											</div>
											<div className="flex items-center gap-2 shrink-0">
												<span className="text-sm text-text-muted">
													{(idx === 0
														? m.elo_change_a
														: m.elo_change_b) >=
														0 && "+"}
													{idx === 0
														? m.elo_change_a
														: m.elo_change_b}
												</span>
												<span className="text-lg font-bold">
													{idx === 0
														? m.score_a
														: m.score_b}
												</span>
											</div>
										</div>
									))}
								</div>

								{/* META */}
								<div className="text-sm text-text-muted text-right shrink-0">
									<div>
										{teamAWon ? "Team A Won" : "Team B Won"}
									</div>
									<div>{dateString}</div>
									{m.tournament_id && (
										<div className="inline-block mt-1 px-2 py-0.5 text-xs rounded-md bg-border text-text-muted">
											Tournament
										</div>
									)}
								</div>
							</div>
						</div>
					);
				})}

				{loading && (
					<p className="text-center text-text-muted py-4">Loading…</p>
				)}
				{!hasMore && !loading && matches.length > 0 && (
					<p className="text-center text-text-muted py-4">
						No more matches
					</p>
				)}
			</section>
		</main>
	);
}
