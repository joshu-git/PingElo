"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PlayersRow, GroupsRow, MatchType } from "@/types/database";

const PAGE_SIZE = 50;

export default function Leaderboard() {
	const [players, setPlayers] = useState<PlayersRow[]>([]);
	const [groups, setGroups] = useState<GroupsRow[]>([]);

	const [matchType, setMatchType] = useState<MatchType>("singles");
	const [scope, setScope] = useState<"global" | "group">("global");
	const [groupId, setGroupId] = useState<string | null>(null);
	const [myGroupId, setMyGroupId] = useState<string | null>(null);

	const groupMap = new Map(groups.map((g) => [g.id, g.group_name]));

	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const [loading, setLoading] = useState(false);

	/* ----------------------------------------
	 * Load groups + user group
	 * ---------------------------------------- */
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

	/* ----------------------------------------
	 * Load leaderboard data
	 * ---------------------------------------- */
	const loadPlayers = useCallback(
		async (reset: boolean) => {
			if (loading) return;
			setLoading(true);

			const currentPage = reset ? 0 : page;

			let query = supabase
				.from("players")
				.select("*")
				.order(
					matchType === "singles" ? "singles_elo" : "doubles_elo",
					{ ascending: false }
				)
				.range(
					currentPage * PAGE_SIZE,
					currentPage * PAGE_SIZE + PAGE_SIZE - 1
				);

			if (scope === "group" && groupId) {
				query = query.eq("group_id", groupId);
			}

			const { data, error } = await query;

			if (!error && data) {
				setPlayers((prev) => (reset ? data : [...prev, ...data]));
				setHasMore(data.length === PAGE_SIZE);
				if (reset) setPage(1);
			}

			setLoading(false);
		},
		[loading, page, matchType, scope, groupId]
	);

	/* Reload on filter change */
	useEffect(() => {
		loadPlayers(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [matchType, scope, groupId]);

	/* Infinite scroll */
	useEffect(() => {
		if (!hasMore || loading) return;

		const onScroll = () => {
			if (
				window.innerHeight + window.scrollY >=
				document.body.offsetHeight - 300
			) {
				loadPlayers(false);
				setPage((p) => p + 1);
			}
		};

		window.addEventListener("scroll", onScroll);
		return () => window.removeEventListener("scroll", onScroll);
	}, [hasMore, loading, loadPlayers]);

	/* ----------------------------------------
	 * UI helpers
	 * ---------------------------------------- */
	const eloValue = (p: PlayersRow) =>
		matchType === "singles" ? p.singles_elo : p.doubles_elo;

	const rankStyle = (rank: number) => {
		if (rank === 1) return "text-yellow-500";
		if (rank === 2) return "text-gray-400";
		if (rank === 3) return "text-amber-600";
		return "text-text-muted";
	};

	/* ----------------------------------------
	 * Render
	 * ---------------------------------------- */
	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HEADER */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
					Leaderboard
				</h1>
				<p className="text-lg max-w-2xl mx-auto text-text-muted">
					Rankings based on competitive Elo performance.
				</p>
			</section>

			{/* CONTROLS */}
			<section className="flex flex-col md:flex-row gap-4 justify-between items-center">
				<div className="flex gap-2">
					<button
						onClick={() => setMatchType("singles")}
						className={`px-4 py-2 rounded-lg ${
							matchType === "singles"
								? "font-semibold underline"
								: ""
						}`}
					>
						Singles
					</button>

					<button
						onClick={() => setMatchType("doubles")}
						className={`px-4 py-2 rounded-lg ${
							matchType === "doubles"
								? "font-semibold underline"
								: ""
						}`}
					>
						Doubles
					</button>
				</div>

				<div className="flex gap-2 items-center">
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
			</section>

			{/* LEADERBOARD */}
			<section className="space-y-2">
				{players.map((p, i) => (
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
								{p.group_id && (
									<p className="text-sm text-text-muted">
										{groupMap.get(p.group_id)} · Member
									</p>
								)}
							</div>
						</div>

						<div className="text-2xl font-bold">{eloValue(p)}</div>
					</div>
				))}

				{loading && (
					<p className="text-center text-text-muted py-4">Loading…</p>
				)}
			</section>
		</main>
	);
}
