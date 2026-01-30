"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MatchType, MatchesRow } from "@/types/database";

type PlayerRow = {
	id: string;
	player_name: string;
	group_id?: string | null;
};

type GroupRow = {
	id: string;
	group_name: string;
};

type TeamPlayer = {
	id: string;
	before: number | null;
};

const PAGE_SIZE = 50;

//Helpers
const eloAfter = (before: number | null, change: number | null) =>
	before !== null && change !== null ? before + change : null;

export default function Matches({
	matchType: controlledMatchType,
}: {
	matchType?: MatchType;
}) {
	const router = useRouter();

	const [matches, setMatches] = useState<MatchesRow[]>([]);
	const [playersData, setPlayersData] = useState<PlayerRow[]>([]);
	const [groups, setGroups] = useState<GroupRow[]>([]);

	const [localMatchType, setLocalMatchType] = useState<MatchType>("singles");
	const matchType = controlledMatchType ?? localMatchType;

	const [scope, setScope] = useState<"global" | "group">("global");
	const [groupId, setGroupId] = useState<string | null>(null);
	const [myGroupId, setMyGroupId] = useState<string | null>(null);

	const cursorRef = useRef<string | null>(null);
	const fetchingRef = useRef(false);

	const [hasMore, setHasMore] = useState(true);
	const [loading, setLoading] = useState(false);

	//Load meta
	useEffect(() => {
		const loadMeta = async () => {
			const [{ data: playerData }, { data: groupData }, session] =
				await Promise.all([
					supabase
						.from("players")
						.select("id, player_name, group_id"),
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
		};

		loadMeta();
	}, []);

	const players = useMemo(
		() => new Map(playersData.map((p) => [p.id, p])),
		[playersData]
	);

	//Load matches
	const loadMatches = useCallback(
		async (reset: boolean) => {
			if (fetchingRef.current) return;
			if (!hasMore && !reset) return;

			fetchingRef.current = true;
			setLoading(true);

			if (reset) {
				cursorRef.current = null;
				setHasMore(true);
			}

			let query = supabase
				.from("matches")
				.select("*")
				.eq("match_type", matchType)
				.order("created_at", { ascending: false })
				.limit(PAGE_SIZE);

			if (cursorRef.current) {
				query = query.lt("created_at", cursorRef.current);
			}

			if (scope === "group" && groupId) {
				const ids = playersData
					.filter((p) => p.group_id === groupId)
					.map((p) => p.id);

				if (ids.length) {
					const idList = ids.join(",");

					query = query.or(
						[
							`player_a1_id.in.(${idList})`,
							`player_a2_id.in.(${idList})`,
							`player_b1_id.in.(${idList})`,
							`player_b2_id.in.(${idList})`,
						].join(",")
					);
				}
			}

			const { data } = await query;
			const rows = (data ?? []) as MatchesRow[];

			if (rows.length < PAGE_SIZE) setHasMore(false);
			if (rows.length) {
				cursorRef.current = rows[rows.length - 1].created_at;
			}

			setMatches((prev) => (reset ? rows : [...prev, ...rows]));

			setLoading(false);
			fetchingRef.current = false;
		},
		[matchType, scope, groupId, playersData, hasMore]
	);

	//Reset on filter change
	useEffect(() => {
		(async () => {
			await loadMatches(true);
		})();
	}, [matchType, scope, groupId, loadMatches]);

	//Infinite scroll
	useEffect(() => {
		const onScroll = () => {
			if (
				fetchingRef.current ||
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

			{/* MATCH CARDS */}
			<section className="space-y-3">
				{matches.map((m) => {
					const teamA: TeamPlayer[] = [
						{ id: m.player_a1_id, before: m.elo_before_a1 },
						m.player_a2_id
							? {
									id: m.player_a2_id,
									before: m.elo_before_a2 ?? null,
								}
							: null,
					].filter((p): p is TeamPlayer => p !== null);

					const teamB: TeamPlayer[] = [
						{ id: m.player_b1_id, before: m.elo_before_b1 },
						m.player_b2_id
							? {
									id: m.player_b2_id,
									before: m.elo_before_b2 ?? null,
								}
							: null,
					].filter((p): p is TeamPlayer => p !== null);

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
							onClick={() => router.push(`/matches/${m.id}`)}
							className="bg-card p-4 rounded-xl hover-card cursor-pointer"
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
									<div>
										{teamAWon ? "Team A Won" : "Team B Won"}
									</div>
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
