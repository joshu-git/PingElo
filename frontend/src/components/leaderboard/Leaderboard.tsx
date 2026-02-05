"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PlayersRow, GroupsRow, MatchType } from "@/types/database";

const PAGE_SIZE = 50;

const RANKS = [
	{ min: 1600, label: "Super Grand Master" },
	{ min: 1400, label: "Grand Master" },
	{ min: 1200, label: "Master" },
	{ min: 1000, label: "Competitor" },
	{ min: 800, label: "Advanced" },
	{ min: 600, label: "Beginner" },
	{ min: 0, label: "Bikini Bottom" },
];

const RANK_STYLES: Record<1 | 2 | 3, string> = {
	1: "text-yellow-500",
	2: "text-gray-400",
	3: "text-amber-600",
};

export default function Leaderboard() {
	const [players, setPlayers] = useState<PlayersRow[]>([]);
	const [groups, setGroups] = useState<GroupsRow[]>([]);
	const [matchCounts, setMatchCounts] = useState<Map<string, number>>(
		new Map()
	);

	const [matchType, setMatchType] = useState<MatchType>("singles");
	const [groupId, setGroupId] = useState<string | null>(null);
	const [myGroupId, setMyGroupId] = useState<string | null>(null);

	const [hasMore, setHasMore] = useState(true);
	const [initialLoading, setInitialLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);

	const loadMoreRef = useRef<HTMLDivElement | null>(null);
	const requestIdRef = useRef(0);

	//Cache match counts per match type
	const matchCountsCacheRef = useRef<{
		singles: Map<string, number>;
		doubles: Map<string, number>;
	}>({
		singles: new Map(),
		doubles: new Map(),
	});

	//Meta
	useEffect(() => {
		const loadMeta = async () => {
			const [{ data: groupData }, session] = await Promise.all([
				supabase.from("groups").select("*").order("group_name"),
				supabase.auth.getSession(),
			]);

			if (groupData) setGroups(groupData);

			if (session.data.session) {
				const { data: player } = await supabase
					.from("players")
					.select("group_id")
					.eq("account_id", session.data.session.user.id)
					.maybeSingle();

				if (player?.group_id) setMyGroupId(player.group_id);
			}
		};

		loadMeta();
	}, []);

	const groupMap = useMemo(
		() => new Map(groups.map((g) => [g.id, g.group_name])),
		[groups]
	);

	//Helpers
	const eloValue = useCallback(
		(p: PlayersRow) =>
			matchType === "singles" ? p.singles_elo : p.doubles_elo,
		[matchType]
	);

	const getRankLabel = (elo: number, matches: number) => {
		if (matches < 5) return "Unranked";
		return RANKS.find((r) => elo >= r.min)?.label ?? "";
	};

	//Fetch match counts
	const fetchMatchesPlayed = useCallback(
		async (playerId: string) => {
			const cache = matchCountsCacheRef.current[matchType];
			if (cache.has(playerId)) return cache.get(playerId)!;

			const orFilter =
				matchType === "singles"
					? `player_a1_id.eq.${playerId},player_b1_id.eq.${playerId}`
					: `player_a1_id.eq.${playerId},player_a2_id.eq.${playerId},player_b1_id.eq.${playerId},player_b2_id.eq.${playerId}`;

			const { count } = await supabase
				.from("matches")
				.select("*", { count: "exact", head: true })
				.or(orFilter)
				.eq("match_type", matchType);

			cache.set(playerId, count ?? 0);
			return count ?? 0;
		},
		[matchType]
	);

	//Load players
	const loadPlayers = useCallback(
		async ({
			offset,
			isFilterChange = false,
		}: {
			offset: number;
			isFilterChange?: boolean;
		}) => {
			const requestId = ++requestIdRef.current;

			//Only show initial loading for first load or group change
			if (offset === 0 && isFilterChange) setInitialLoading(true);
			else if (offset > 0) setLoadingMore(true);

			let query = supabase
				.from("players")
				.select("*")
				.order(
					matchType === "singles" ? "singles_elo" : "doubles_elo",
					{ ascending: false }
				);

			if (groupId) query = query.eq("group_id", groupId);

			const { data } = await query.range(offset, offset + PAGE_SIZE - 1);

			if (requestId !== requestIdRef.current) return;

			if (data) {
				setPlayers((prev) =>
					offset === 0 ? data : [...prev, ...data]
				);
				setHasMore(data.length === PAGE_SIZE);

				const nextCounts = new Map(matchCounts);

				await Promise.all(
					data.map(async (p) => {
						const count = await fetchMatchesPlayed(p.id);
						nextCounts.set(p.id, count);
					})
				);

				setMatchCounts(nextCounts);
			}

			setInitialLoading(false);
			setLoadingMore(false);
		},
		[groupId, matchType, fetchMatchesPlayed, matchCounts]
	);

	//Initial load
	useEffect(() => {
		const loadInitial = async () => {
			await loadPlayers({ offset: 0 });
		};
		loadInitial();
	}, [loadPlayers]);

	//Infinite scroll
	useEffect(() => {
		if (!loadMoreRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loadingMore) {
					loadPlayers({ offset: players.length });
				}
			},
			{ rootMargin: "300px" }
		);

		observer.observe(loadMoreRef.current);
		return () => observer.disconnect();
	}, [players.length, hasMore, loadingMore, loadPlayers]);

	//Sorting + partitioning
	const sortedPlayers = useMemo(
		() => [...players].sort((a, b) => eloValue(b) - eloValue(a)),
		[players, eloValue]
	);

	const { rankedPlayers, unrankedPlayers } = useMemo(() => {
		const ranked: PlayersRow[] = [];
		const unranked: PlayersRow[] = [];

		for (const p of sortedPlayers) {
			const matches = matchCounts.get(p.id) ?? 0;
			(matches < 5 ? unranked : ranked).push(p);
		}

		return { rankedPlayers: ranked, unrankedPlayers: unranked };
	}, [sortedPlayers, matchCounts]);

	//Filter handler
	const handleFilterChange = (
		newType: MatchType,
		newGroupId: string | null
	) => {
		setMatchType(newType);

		if (newGroupId !== groupId) {
			setGroupId(newGroupId);
			//Trigger a full reload
			loadPlayers({ offset: 0, isFilterChange: true });
		}
	};

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">
					Leaderboard
				</h1>
				<p className="text-text-muted">
					Rankings based on competitive Elo performance.
				</p>
			</section>

			{/* Filter controls */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-wrap justify-center gap-2">
					<button
						onClick={() => handleFilterChange("singles", groupId)}
						className={`px-4 py-2 rounded-lg ${
							matchType === "singles"
								? "underline font-semibold"
								: ""
						}`}
					>
						Singles
					</button>
					<button
						onClick={() => handleFilterChange("doubles", groupId)}
						className={`px-4 py-2 rounded-lg ${
							matchType === "doubles"
								? "underline font-semibold"
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
						onChange={(e) =>
							handleFilterChange(
								matchType,
								e.target.value || null
							)
						}
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
						onClick={() => handleFilterChange(matchType, myGroupId)}
						className="px-4 py-2 rounded-lg disabled:opacity-50"
					>
						My Group
					</button>

					<button
						onClick={() => handleFilterChange(matchType, null)}
						className="px-4 py-2 rounded-lg"
					>
						Global
					</button>
				</div>
			</div>

			<section className="space-y-2">
				{/* Initial loading */}
				{initialLoading && (
					<p className="text-center text-text-muted py-4">Loading…</p>
				)}

				{/* Ranked players */}
				{rankedPlayers.map((p, i) => {
					const rank = i + 1;
					const matches = matchCounts.get(p.id) ?? 0;
					const elo = eloValue(p);
					const rankClass =
						RANK_STYLES[rank as 1 | 2 | 3] ?? "text-text-muted";

					return (
						<div
							key={p.id}
							className="flex items-center justify-between bg-card p-4 rounded-xl hover-card"
						>
							<div className="flex items-center gap-4">
								<div
									className={`text-lg font-bold w-8 ${rankClass}`}
								>
									#{rank}
								</div>
								<div>
									<Link
										href={`/profile/${p.player_name}`}
										className="font-semibold hover:underline"
									>
										{p.player_name}
									</Link>
									<p className="text-sm text-text-muted">
										{groupMap.get(p.group_id!)} ·{" "}
										{getRankLabel(elo, matches)}
									</p>
								</div>
							</div>
							<div className="text-2xl font-bold">{elo}</div>
						</div>
					);
				})}

				{/* Unranked */}
				{unrankedPlayers.length > 0 && (
					<>
						<div className="py-8" />
						<h2 className="text-xl font-bold text-center text-text-muted mb-4">
							Unranked
						</h2>
					</>
				)}

				{unrankedPlayers.map((p) => {
					const matches = matchCounts.get(p.id) ?? 0;
					const elo = eloValue(p);

					return (
						<div
							key={p.id}
							className="flex items-center justify-between bg-card p-4 rounded-xl hover-card opacity-70"
						>
							<div className="flex items-center gap-4">
								<div className="text-lg font-bold w-8 text-text-muted">
									-
								</div>
								<div>
									<Link
										href={`/profile/${p.player_name}`}
										className="font-semibold hover:underline"
									>
										{p.player_name}
									</Link>
									<p className="text-sm text-text-muted">
										{groupMap.get(p.group_id!)} ·{" "}
										{getRankLabel(elo, matches)}
									</p>
								</div>
							</div>
							<div className="text-2xl font-bold">{elo}</div>
						</div>
					);
				})}

				{/* Infinite scroll loading */}
				{loadingMore && (
					<p className="text-center text-text-muted py-4">
						Loading more…
					</p>
				)}

				<div ref={loadMoreRef} />
			</section>
		</main>
	);
}
