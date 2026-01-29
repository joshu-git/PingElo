"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PlayersRow, GroupsRow, MatchType, MatchesRow } from "@/types/database";

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
	const [matches, setMatches] = useState<MatchesRow[]>([]);

	const [matchType, setMatchType] = useState<MatchType>("singles");
	const [groupId, setGroupId] = useState<string | null>(null);
	const [myGroupId, setMyGroupId] = useState<string | null>(null);

	const [hasMore, setHasMore] = useState(true);
	const [loading, setLoading] = useState(false);

	const loadMoreRef = useRef<HTMLDivElement | null>(null);

	//Metadata
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

				if (player?.group_id) {
					setMyGroupId(player.group_id);
				}
			}
		};

		loadMeta();
	}, []);

	//Matches
	useEffect(() => {
		const loadMatches = async () => {
			const { data } = await supabase.from("matches").select("*");
			if (data) setMatches(data);
		};

		loadMatches();
	}, []);

	//Derived helpers
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

	//Match count maps
	const { singlesMap, doublesMap } = useMemo(() => {
		const singles = new Map<string, number>();
		const doubles = new Map<string, number>();

		for (const m of matches) {
			const ids =
				m.match_type === "singles"
					? [m.player_a1_id, m.player_b1_id]
					: [
							m.player_a1_id,
							m.player_b1_id,
							m.player_a2_id,
							m.player_b2_id,
						];

			for (const id of ids) {
				if (!id) continue;
				const map = m.match_type === "singles" ? singles : doubles;
				map.set(id, (map.get(id) ?? 0) + 1);
			}
		}

		return { singlesMap: singles, doublesMap: doubles };
	}, [matches]);

	//Rank computation
	const getRank = useCallback((elo: number, matchesPlayed: number) => {
		if (matchesPlayed < 5) return "Unranked";
		return RANKS.find((r) => elo >= r.min)?.label ?? "Rookie";
	}, []);

	//Data loading
	const loadPlayers = useCallback(
		async ({
			reset,
			offset,
			type,
		}: {
			reset: boolean;
			offset: number;
			type: MatchType;
		}) => {
			setLoading(true);

			let query = supabase.from("players").select("*");

			if (groupId) query = query.eq("group_id", groupId);

			const { data } = await query.range(offset, offset + PAGE_SIZE - 1);

			if (data) {
				//Sort explicitly based on type
				const sorted = [...data].sort((a, b) =>
					type === "singles"
						? b.singles_elo - a.singles_elo
						: b.doubles_elo - a.doubles_elo
				);
				setPlayers((prev) => (reset ? sorted : [...prev, ...sorted]));
				setHasMore(data.length === PAGE_SIZE);
			}

			setLoading(false);
		},
		[groupId]
	);

	//Reload on filters
	const resetAndLoad = useCallback(
		(type: MatchType) => {
			setPlayers([]);
			setHasMore(true);
			loadPlayers({ reset: true, offset: 0, type });
		},
		[loadPlayers]
	);

	//Infinite scroll
	useEffect(() => {
		if (!loadMoreRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && !loading && hasMore) {
					loadPlayers({
						reset: false,
						offset: players.length,
						type: matchType,
					});
				}
			},
			{ rootMargin: "300px" }
		);

		observer.observe(loadMoreRef.current);
		return () => observer.disconnect();
	}, [loadPlayers, players.length, loading, hasMore, matchType]);

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
						onClick={() => {
							setMatchType("singles");
							resetAndLoad("singles");
						}}
						className={
							matchType === "singles"
								? "underline font-semibold"
								: ""
						}
					>
						Singles
					</button>
					<button
						onClick={() => {
							setMatchType("doubles");
							resetAndLoad("doubles");
						}}
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
						onChange={(e) => {
							setGroupId(e.target.value || null);
							resetAndLoad(matchType);
						}}
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
							setGroupId(myGroupId);
							resetAndLoad(matchType);
						}}
					>
						My Group
					</button>

					<button
						onClick={() => {
							setGroupId(null);
							resetAndLoad(matchType);
						}}
					>
						Global
					</button>
				</div>
			</div>

			<section className="space-y-2">
				{players.map((p, i) => {
					const matchesPlayed =
						matchType === "singles"
							? (singlesMap.get(p.id) ?? 0)
							: (doublesMap.get(p.id) ?? 0);

					const elo = eloValue(p);

					return (
						<div
							key={p.id}
							className="flex items-center justify-between bg-card p-4 rounded-xl hover-card"
						>
							<div className="flex items-center gap-4">
								<div
									className={`text-lg font-bold w-8 ${rankStyle(i + 1)}`}
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
										<span
											className={
												matchesPlayed < 5
													? "text-text-subtle"
													: ""
											}
										>
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

				{loading && (
					<p className="text-center text-text-muted py-4">Loading…</p>
				)}
			</section>
		</main>
	);
}
