"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
	profilePlayerId,
	matchType: controlledMatchType,
}: {
	profilePlayerId?: string;
	matchType?: MatchType;
}) {
	const router = useRouter();

	const [matches, setMatches] = useState<MatchRow[]>([]);
	const [players, setPlayers] = useState<Map<string, PlayerRow>>(new Map());
	const [groups, setGroups] = useState<GroupRow[]>([]);

	const [localMatchType, setLocalMatchType] = useState<MatchType>("singles");

	const matchType = controlledMatchType ?? localMatchType;

	const [scope, setScope] = useState<"global" | "group">("global");
	const [groupId, setGroupId] = useState<string | null>(null);
	const [myGroupId, setMyGroupId] = useState<string | null>(null);

	const pageRef = useRef(0);
	const [hasMore, setHasMore] = useState(true);
	const [loading, setLoading] = useState(false);

	const loadingRef = useRef(false);

	/* -------------------- Load meta -------------------- */
	useEffect(() => {
		const loadMeta = async () => {
			const [{ data: playerData }, { data: groupData }, session] =
				await Promise.all([
					supabase.from("players").select("id, player_name"),
					supabase.from("groups").select("*").order("group_name"),
					supabase.auth.getSession(),
				]);

			if (playerData)
				setPlayers(
					new Map((playerData as PlayerRow[]).map((p) => [p.id, p]))
				);
			if (groupData) setGroups(groupData as GroupRow[]);
			if (session.data.session) {
				const { data: me } = await supabase
					.from("players")
					.select("group_id")
					.eq("account_id", session.data.session.user.id)
					.maybeSingle();
				if (me?.group_id) setMyGroupId(me.group_id);
			}
		};
		loadMeta();
	}, []);

	/* -------------------- Load matches -------------------- */
	const loadMatches = useCallback(
		async (reset: boolean) => {
			if (loadingRef.current) return;
			loadingRef.current = true;
			setLoading(true);

			const currentPage = reset ? 0 : pageRef.current;

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

			pageRef.current = reset ? 1 : pageRef.current + 1;

			loadingRef.current = false;
			setLoading(false);
		},
		[matchType, scope, groupId, profilePlayerId]
	);

	/* -------------------- Initial load -------------------- */
	useEffect(() => {
		const run = async () => {
			pageRef.current = 0;
			await loadMatches(true);
		};
		run();
	}, [matchType, scope, groupId, profilePlayerId, loadMatches]);

	/* -------------------- Infinite scroll -------------------- */
	useEffect(() => {
		const onScroll = () => {
			if (
				loadingRef.current ||
				!hasMore ||
				window.innerHeight + window.scrollY <
					document.body.offsetHeight - 300
			)
				return;

			loadMatches(false);
		};

		window.addEventListener("scroll", onScroll);
		return () => window.removeEventListener("scroll", onScroll);
	}, [hasMore, loadMatches]);

	/* -------------------- Helpers -------------------- */
	const eloAfter = (
		before?: number | null,
		change?: number | null
	): number | null =>
		before != null && change != null ? before + change : null;

	const didPlayerWin = (m: MatchRow): boolean | null => {
		if (!profilePlayerId) return null;
		const teamAWon = m.score_a > m.score_b;
		const isOnTeamA = [m.player_a1_id, m.player_a2_id].includes(
			profilePlayerId
		);
		const isOnTeamB = [m.player_b1_id, m.player_b2_id].includes(
			profilePlayerId
		);
		if (isOnTeamA) return teamAWon;
		if (isOnTeamB) return !teamAWon;
		return null;
	};

	/* -------------------- Render -------------------- */
	return (
		<main
			className={`${
				profilePlayerId ? "" : "max-w-5xl mx-auto px-4 py-16 space-y-12"
			}`}
		>
			{/* HEADER only on standalone page */}
			{!profilePlayerId && (
				<section className="text-center space-y-4">
					<h1 className="text-4xl md:text-5xl font-extrabold">
						Matches
					</h1>
					<p className="text-text-muted">
						Match history with Elo changes.
					</p>
				</section>
			)}

			{/* CONTROLS only on standalone page */}
			{!profilePlayerId && (
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-wrap justify-center gap-2">
						<button
							onClick={() => setLocalMatchType("singles")}
							className={`px-4 py-2 rounded-lg ${
								matchType === "singles"
									? "font-semibold underline"
									: ""
							}`}
						>
							Singles
						</button>
						<button
							onClick={() => setLocalMatchType("doubles")}
							className={`px-4 py-2 rounded-lg ${
								matchType === "doubles"
									? "font-semibold underline"
									: ""
							}`}
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
			)}

			{/* MATCH CARDS */}
			<section className="space-y-3">
				{matches.map((m) => {
					const teamA = [
						{ id: m.player_a1_id, before: m.elo_before_a1 },
						m.player_a2_id && {
							id: m.player_a2_id,
							before: m.elo_before_a2,
						},
					].filter(Boolean) as {
						id: string;
						before?: number | null;
					}[];

					const teamB = [
						{ id: m.player_b1_id, before: m.elo_before_b1 },
						m.player_b2_id && {
							id: m.player_b2_id,
							before: m.elo_before_b2,
						},
					].filter(Boolean) as {
						id: string;
						before?: number | null;
					}[];

					const playerWon = didPlayerWin(m);
					const teamAWon = m.score_a > m.score_b;

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
							onClick={() => router.push(`/match/${m.id}`)}
							className={`bg-card p-4 rounded-xl hover-card cursor-pointer ${
								profilePlayerId ? "" : "max-w-5xl mx-auto"
							}`}
						>
							<div className="flex justify-between gap-6">
								<div className="flex-1 space-y-3">
									{/* TEAM A */}
									<div className="flex justify-between items-center">
										<div
											className={`flex gap-1 whitespace-nowrap ${nameSizeClass}`}
										>
											{teamA.map((p, i) => (
												<span
													key={p.id}
													className="flex items-center gap-1"
												>
													<Link
														href={`/profile/${
															players.get(p.id)
																?.player_name
														}`}
														onClick={(e) =>
															e.stopPropagation()
														} // prevent match card click
														className="hover:underline cursor-pointer"
													>
														{
															players.get(p.id)
																?.player_name
														}
													</Link>
													<span
														className={`${eloSizeClass} text-text-subtle`}
													>
														(
														{eloAfter(
															p.before,
															m.elo_change_a
														) ?? "—"}
														)
													</span>
													{i === 0 &&
														teamA.length > 1 &&
														" & "}
												</span>
											))}
										</div>

										<div className="flex items-center gap-2 shrink-0">
											<span className="text-sm text-text-muted">
												{m.elo_change_a >= 0 && "+"}
												{m.elo_change_a}
											</span>
											<span className="text-lg font-bold">
												{m.score_a}
											</span>
										</div>
									</div>

									{/* TEAM B */}
									<div className="flex justify-between items-center">
										<div
											className={`flex gap-1 whitespace-nowrap ${nameSizeClass}`}
										>
											{teamB.map((p, i) => (
												<span
													key={p.id}
													className="flex items-center gap-1"
												>
													<Link
														href={`/profile/${
															players.get(p.id)
																?.player_name
														}`}
														onClick={(e) =>
															e.stopPropagation()
														}
														className="hover:underline cursor-pointer"
													>
														{
															players.get(p.id)
																?.player_name
														}
													</Link>
													<span
														className={`${eloSizeClass} text-text-subtle`}
													>
														(
														{eloAfter(
															p.before,
															m.elo_change_b
														) ?? "—"}
														)
													</span>
													{i === 0 &&
														teamB.length > 1 &&
														" & "}
												</span>
											))}
										</div>

										<div className="flex items-center gap-2 shrink-0">
											<span className="text-sm text-text-muted">
												{m.elo_change_b >= 0 && "+"}
												{m.elo_change_b}
											</span>
											<span className="text-lg font-bold">
												{m.score_b}
											</span>
										</div>
									</div>
								</div>

								{/* META */}
								<div className="text-sm text-text-muted text-right shrink-0">
									{profilePlayerId && playerWon != null && (
										<div>{playerWon ? "Win" : "Loss"}</div>
									)}
									{!profilePlayerId && (
										<div>
											{teamAWon
												? "Team A Won"
												: "Team B Won"}
										</div>
									)}
									<div>
										{new Date(
											m.created_at
										).toLocaleDateString()}
									</div>
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
			</section>
		</main>
	);
}
