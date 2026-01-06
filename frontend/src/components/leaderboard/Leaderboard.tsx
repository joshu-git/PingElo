"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PlayersRow, MatchType } from "@/types/database";

const PAGE_SIZE = 50;

export default function Leaderboard() {
	const [players, setPlayers] = useState<PlayersRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);

	const [matchType, setMatchType] = useState<MatchType>("singles");
	const [scope, setScope] = useState<"global" | "group">("global");
	const [search, setSearch] = useState("");

	const [groupId, setGroupId] = useState<string | null>(null);

	/* -----------------------------------------
	 * Fetch logged-in user's group (once)
	 * ----------------------------------------- */
	useEffect(() => {
		let mounted = true;

		(async () => {
			const { data } = await supabase.auth.getSession();
			if (!data.session || !mounted) return;

			const { data: player } = await supabase
				.from("players")
				.select("group_id")
				.eq("account_id", data.session.user.id)
				.maybeSingle();

			if (mounted && player?.group_id) {
				setGroupId(player.group_id);
			}
		})();

		return () => {
			mounted = false;
		};
	}, []);

	/* -----------------------------------------
	 * Core loader (optionally resets)
	 * ----------------------------------------- */
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

			if (search.trim()) {
				query = query.ilike("player_name", `%${search.trim()}%`);
			}

			const { data, error } = await query;

			if (error) {
				console.error(error);
				setLoading(false);
				return;
			}

			setPlayers((prev) =>
				reset ? data ?? [] : [...prev, ...(data ?? [])]
			);

			setHasMore((data?.length ?? 0) === PAGE_SIZE);

			if (reset) {
				setPage(1);
			}

			setLoading(false);
		},
		[page, matchType, scope, groupId, search, loading]
	);

	/* -----------------------------------------
	 * Reload when filters change
	 * ----------------------------------------- */
	useEffect(() => {
		loadPlayers(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [matchType, scope, search, groupId]);

	/* -----------------------------------------
	 * Infinite scroll
	 * ----------------------------------------- */
	useEffect(() => {
		if (!hasMore || loading) return;

		const onScroll = () => {
			if (
				window.innerHeight + window.scrollY >=
				document.body.offsetHeight - 400
			) {
				loadPlayers(false);
				setPage((p) => p + 1);
			}
		};

		window.addEventListener("scroll", onScroll);
		return () => window.removeEventListener("scroll", onScroll);
	}, [hasMore, loading, loadPlayers]);

	/* -----------------------------------------
	 * Group suggestion ordering
	 * ----------------------------------------- */
	const visiblePlayers = useMemo(() => {
		if (scope === "group" && groupId) {
			const inGroup = players.filter((p) => p.group_id === groupId);
			const rest = players.filter((p) => p.group_id !== groupId);
			return [...inGroup, ...rest];
		}
		return players;
	}, [players, scope, groupId]);

	/* -----------------------------------------
	 * Render
	 * ----------------------------------------- */
	return (
		<div className="max-w-5xl mx-auto px-4 py-16 space-y-10">
			{/* Header */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
					Leaderboard
				</h1>
				<p className="text-lg text-white/70 max-w-2xl mx-auto">
					Rankings across all matches, updated live.
				</p>
			</section>

			{/* Controls */}
			<div className="flex flex-col md:flex-row gap-4 justify-between items-center max-w-3xl mx-auto">
				<div className="flex gap-2">
					<button
						onClick={() => setMatchType("singles")}
						className={`px-4 py-2 rounded-lg ${
							matchType === "singles"
								? "bg-purple-600"
								: "bg-card"
						}`}
					>
						Singles
					</button>
					<button
						onClick={() => setMatchType("doubles")}
						className={`px-4 py-2 rounded-lg ${
							matchType === "doubles"
								? "bg-purple-600"
								: "bg-card"
						}`}
					>
						Doubles
					</button>
				</div>

				<div className="flex gap-2">
					<button
						onClick={() => setScope("global")}
						className={`px-4 py-2 rounded-lg ${
							scope === "global" ? "bg-purple-600" : "bg-card"
						}`}
					>
						Global
					</button>
					<button
						disabled={!groupId}
						onClick={() => setScope("group")}
						className={`px-4 py-2 rounded-lg ${
							scope === "group" ? "bg-purple-600" : "bg-card"
						} ${!groupId ? "opacity-50 cursor-not-allowed" : ""}`}
					>
						My Group
					</button>
				</div>

				<input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search player…"
					className="px-4 py-2 rounded-lg bg-card border border-border w-full md:w-64"
				/>
			</div>

			{/* Table */}
			<div className="max-w-3xl mx-auto rounded-xl bg-card border border-border overflow-hidden">
				<table className="w-full">
					<thead className="bg-card/60 border-b border-border">
						<tr>
							<th className="px-4 py-3 text-left">#</th>
							<th className="px-4 py-3 text-left">Player</th>
							<th className="px-4 py-3 text-right">Elo</th>
						</tr>
					</thead>
					<tbody>
						{visiblePlayers.map((p, i) => (
							<tr
								key={p.id}
								className="border-b border-border hover:bg-card/60"
							>
								<td className="px-4 py-3 font-semibold">
									{i + 1}
								</td>
								<td className="px-4 py-3">
									<Link
										href={`/profile/${p.player_name}`}
										className="hover:text-purple-400"
									>
										{p.player_name}
									</Link>
								</td>
								<td className="px-4 py-3 text-right font-semibold">
									{matchType === "singles"
										? p.singles_elo
										: p.doubles_elo}
								</td>
							</tr>
						))}
					</tbody>
				</table>

				{loading && (
					<p className="text-center py-4 text-text-muted">Loading…</p>
				)}
				{!hasMore && (
					<p className="text-center py-4 text-text-muted">
						End of leaderboard
					</p>
				)}
			</div>
		</div>
	);
}
