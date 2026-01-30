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
	{ min: 800, label: "Advanced Beginner" },
	{ min: 600, label: "Beginner" },
	{ min: 0, label: "Bikini Bottom" },
];

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
	const [loading, setLoading] = useState(true);

	const loadMoreRef = useRef<HTMLDivElement | null>(null);

	/* ------------------ META ------------------ */

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

	/* ------------------ DERIVED ------------------ */

	const groupMap = useMemo(
		() => new Map(groups.map((g) => [g.id, g.group_name])),
		[groups]
	);

	const eloValue = useCallback(
		(p: PlayersRow) =>
			matchType === "singles" ? p.singles_elo : p.doubles_elo,
		[matchType]
	);

	const rankStyle = (rank: number) => {
		if (rank === 1) return "text-yellow-500";
		if (rank === 2) return "text-gray-400";
		if (rank === 3) return "text-amber-600";
		return "text-text-muted";
	};

	/* ------------------ MATCH COUNTS (BULK) ------------------ */

	const fetchMatchCounts = useCallback(
		async (players: PlayersRow[]) => {
			if (players.length === 0) return new Map<string, number>();

			const playerIds = players.map((p) => p.id);

			const orFilter =
				matchType === "singles"
					? playerIds
							.map(
								(id) =>
									`player_a1_id.eq.${id},player_b1_id.eq.${id}`
							)
							.join(",")
					: playerIds
							.map(
								(id) =>
									`player_a1_id.eq.${id},player_a2_id.eq.${id},player_b1_id.eq.${id},player_b2_id.eq.${id}`
							)
							.join(",");

			const { data: matches } = await supabase
				.from("matches")
				.select(
					"player_a1_id, player_a2_id, player_b1_id, player_b2_id"
				)
				.or(orFilter)
				.eq("match_type", matchType);

			const counts = new Map<string, number>();

			matches?.forEach((m) => {
				[
					m.player_a1_id,
					m.player_a2_id,
					m.player_b1_id,
					m.player_b2_id,
				].forEach((id) => {
					if (id && playerIds.includes(id)) {
						counts.set(id, (counts.get(id) ?? 0) + 1);
					}
				});
			});

			return counts;
		},
		[matchType]
	);

	/* ------------------ LOAD PLAYERS ------------------ */

	const loadPlayers = useCallback(
		async ({ offset }: { offset: number }) => {
			if (offset === 0) setLoading(true);

			let query = supabase.from("players").select("*");
			if (groupId) query = query.eq("group_id", groupId);

			const { data } = await query.range(offset, offset + PAGE_SIZE - 1);

			if (!data || data.length === 0) {
				setHasMore(false);
				setLoading(false);
				return;
			}

			const counts = await fetchMatchCounts(data);

			setPlayers((prev) => (offset === 0 ? data : [...prev, ...data]));

			setMatchCounts((prev) => {
				const next = new Map(prev);
				counts.forEach((v, k) => next.set(k, v));
				return next;
			});

			setHasMore(data.length === PAGE_SIZE);
			setLoading(false);
		},
		[groupId, fetchMatchCounts]
	);

	/* ------------------ INFINITE SCROLL ------------------ */

	useEffect(() => {
		if (!loadMoreRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && !loading && hasMore) {
					loadPlayers({ offset: players.length });
				}
			},
			{ rootMargin: "300px" }
		);

		observer.observe(loadMoreRef.current);
		return () => observer.disconnect();
	}, [players.length, loading, hasMore, loadPlayers]);

	/* ------------------ FILTER CHANGE ------------------ */

	const handleFilterChange = (
		newType: MatchType,
		newGroupId: string | null
	) => {
		setMatchType(newType);
		setGroupId(newGroupId);
		setPlayers([]);
		setMatchCounts(new Map());
		setHasMore(true);
		loadPlayers({ offset: 0 });
	};

	/* ------------------ RANKING ------------------ */

	const { rankedPlayers, unrankedPlayers } = useMemo(() => {
		const ranked: PlayersRow[] = [];
		const unranked: PlayersRow[] = [];

		for (const p of players) {
			const matchesPlayed = matchCounts.get(p.id) ?? 0;
			(matchesPlayed < 5 ? unranked : ranked).push(p);
		}

		const sortFn = (a: PlayersRow, b: PlayersRow) =>
			eloValue(b) - eloValue(a);

		ranked.sort(sortFn);
		unranked.sort(sortFn);

		return { rankedPlayers: ranked, unrankedPlayers: unranked };
	}, [players, matchCounts, eloValue]);

	/* ------------------ INITIAL LOAD ------------------ */

	useEffect(() => {
		const loadInitial = async () => {
			await loadPlayers({ offset: 0 });
		};
		loadInitial();
	}, [loadPlayers]);

	const getRank = useCallback((elo: number, matches: number) => {
		if (matches < 5) return "Unranked";
		return RANKS.find((r) => elo >= r.min)?.label ?? "";
	}, []);

	/* ------------------ RENDER ------------------ */

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">
					Leaderboard
				</h1>
				<p className="text-lg text-text-muted">
					Rankings based on competitive Elo performance.
				</p>
			</section>

			<div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
				<div className="flex gap-2">
					<button
						onClick={() => handleFilterChange("singles", groupId)}
						className={
							matchType === "singles"
								? "underline font-semibold"
								: ""
						}
					>
						Singles
					</button>
					<button
						onClick={() => handleFilterChange("doubles", groupId)}
						className={
							matchType === "doubles"
								? "underline font-semibold"
								: ""
						}
					>
						Doubles
					</button>
				</div>

				<div className="flex gap-2">
					<select
						value={groupId ?? ""}
						onChange={(e) =>
							handleFilterChange(
								matchType,
								e.target.value || null
							)
						}
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
					>
						My Group
					</button>

					<button onClick={() => handleFilterChange(matchType, null)}>
						Global
					</button>
				</div>
			</div>

			<section className="space-y-2">
				{rankedPlayers.map((p, i) => {
					const matchesPlayed = matchCounts.get(p.id) ?? 0;
					const elo = eloValue(p);

					return (
						<div
							key={p.id}
							className="flex items-center justify-between bg-card p-4 rounded-xl hover-card"
						>
							<div className="flex items-center gap-4">
								<div
									className={`text-lg font-bold w-8 ${rankStyle(
										i + 1
									)}`}
								>
									#{i + 1}
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
										<span>
											{getRank(elo, matchesPlayed)}
										</span>
									</p>
								</div>
							</div>
							<div className="text-2xl font-bold">{elo}</div>
						</div>
					);
				})}

				{unrankedPlayers.length > 0 && (
					<>
						<div className="py-8" />
						<h2 className="text-xl font-bold text-center text-text-muted mb-4">
							Unranked
						</h2>
					</>
				)}

				{unrankedPlayers.map((p) => {
					const matchesPlayed = matchCounts.get(p.id) ?? 0;
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
										<span>
											{getRank(elo, matchesPlayed)}
										</span>
									</p>
								</div>
							</div>
							<div className="text-2xl font-bold">{elo}</div>
						</div>
					);
				})}

				<div ref={loadMoreRef} />

				{loading && players.length === 0 && (
					<p className="text-center text-text-muted py-4">Loading…</p>
				)}
			</section>
		</main>
	);
}
