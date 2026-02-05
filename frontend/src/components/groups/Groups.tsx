"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 50;

type Group = {
	id: string;
	group_name: string;
	group_description?: string | null;
	group_owner_id?: string | null;
	open: boolean;
	created_at: string;
};

type PlayerRow = {
	player_name: string;
	account_id: string | null;
};

type GroupWithActivity = Group & {
	last_activity: string;
};

type Filter = "all" | "open" | "request";

export default function Groups() {
	const [allGroups, setAllGroups] = useState<GroupWithActivity[]>([]);
	const [groups, setGroups] = useState<GroupWithActivity[]>([]);
	const [players, setPlayers] = useState<PlayerRow[]>([]);
	const [filter, setFilter] = useState<Filter>("all");

	const cursorRef = useRef(0);
	const fetchingRef = useRef(false);

	const [hasMore, setHasMore] = useState(true);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	/* ---------- Initial load ---------- */
	useEffect(() => {
		const load = async () => {
			try {
				const [{ data: groupRows }, { data: playerRows }] =
					await Promise.all([
						supabase
							.from("groups")
							.select(
								"id, group_name, group_description, group_owner_id, open, created_at"
							),
						supabase
							.from("players")
							.select("player_name, account_id"),
					]);

				setPlayers(playerRows ?? []);

				if (!groupRows) {
					setLoading(false);
					return;
				}

				// Fetch latest match PER GROUP
				const enriched: GroupWithActivity[] = [];

				for (const g of groupRows) {
					const { data: match } = await supabase
						.from("matches")
						.select("created_at")
						.eq("group_id", g.id)
						.order("created_at", { ascending: false })
						.limit(1)
						.maybeSingle();

					enriched.push({
						...g,
						last_activity: match?.created_at ?? g.created_at,
					});
				}

				// Sort by activity DESC
				enriched.sort(
					(a, b) =>
						new Date(b.last_activity).getTime() -
						new Date(a.last_activity).getTime()
				);

				setAllGroups(enriched);
				setGroups(enriched.slice(0, PAGE_SIZE));
				cursorRef.current = PAGE_SIZE;
				setHasMore(enriched.length > PAGE_SIZE);
			} catch (e) {
				console.error(e);
				setError("Failed to load groups.");
			} finally {
				setLoading(false);
			}
		};

		load();
	}, []);

	/* ---------- Owner map ---------- */
	const ownerMap = useMemo(
		() =>
			new Map(
				players
					.filter((p) => p.account_id)
					.map((p) => [p.account_id!, p.player_name])
			),
		[players]
	);

	/* ---------- Filtered source ---------- */
	const filteredSource = useMemo(() => {
		if (filter === "open") {
			return allGroups.filter((g) => g.open);
		}
		if (filter === "request") {
			return allGroups.filter((g) => !g.open);
		}
		return allGroups;
	}, [allGroups, filter]);

	/* ---------- Load more (infinite scroll) ---------- */
	const loadMore = useCallback(() => {
		if (fetchingRef.current || !hasMore) return;

		fetchingRef.current = true;

		const next = filteredSource.slice(
			cursorRef.current,
			cursorRef.current + PAGE_SIZE
		);

		setGroups((prev) => [...prev, ...next]);
		cursorRef.current += PAGE_SIZE;
		setHasMore(cursorRef.current < filteredSource.length);

		fetchingRef.current = false;
	}, [filteredSource, hasMore]);

	/* ---------- Reset on filter change ---------- */
	useEffect(() => {
		cursorRef.current = PAGE_SIZE;
		setGroups(filteredSource.slice(0, PAGE_SIZE));
		setHasMore(filteredSource.length > PAGE_SIZE);
	}, [filter, filteredSource]);

	/* ---------- Scroll listener ---------- */
	useEffect(() => {
		const onScroll = () => {
			if (
				fetchingRef.current ||
				!hasMore ||
				window.innerHeight + window.scrollY <
					document.body.offsetHeight - 300
			)
				return;

			loadMore();
		};

		window.addEventListener("scroll", onScroll);
		return () => window.removeEventListener("scroll", onScroll);
	}, [loadMore, hasMore]);

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HEADER */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">Groups</h1>
				<p className="text-text-muted">Most active groups first.</p>
			</section>

			{/* CONTROLS */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-wrap justify-center gap-2">
					{[
						["all", "All"],
						["open", "Open"],
						["request", "Request Only"],
					].map(([v, label]) => (
						<button
							key={v}
							onClick={() => setFilter(v as Filter)}
							className={`px-4 py-2 rounded-lg ${
								filter === v ? "font-semibold underline" : ""
							}`}
						>
							{label}
						</button>
					))}
				</div>

				<div className="flex flex-wrap justify-center gap-2">
					<Link href="/groups/create">
						<button className="px-4 py-2 rounded-lg">
							Create Group
						</button>
					</Link>
					<button className="px-4 py-2 rounded-lg">Find Group</button>
				</div>
			</div>

			{/* GROUP CARDS */}
			<section className="space-y-3">
				{groups.map((g) => {
					const ownerName = g.group_owner_id
						? ownerMap.get(g.group_owner_id)
						: null;

					return (
						<div
							key={g.id}
							onClick={() =>
								(window.location.href = `/groups/${g.group_name}`)
							}
							className="bg-card p-4 rounded-xl hover-card cursor-pointer transition"
						>
							<div className="flex justify-between gap-6">
								{/* LEFT */}
								<div className="flex-1 min-w-0 space-y-1.5">
									<h2 className="font-semibold text-[clamp(1rem,4vw,1.125rem)] truncate">
										{g.group_name}
									</h2>

									<p className="text-text-subtle text-[clamp(0.8rem,3.5vw,0.875rem)] leading-snug line-clamp-2">
										{g.group_description?.trim() ||
											"No Description"}
									</p>

									{ownerName && (
										<p className="text-[clamp(0.75rem,3vw,0.85rem)] text-text-muted">
											Owner:{" "}
											<Link
												href={`/profile/${ownerName}`}
												onClick={(e) =>
													e.stopPropagation()
												}
												className="hover:underline"
											>
												{ownerName}
											</Link>
										</p>
									)}
								</div>

								{/* RIGHT */}
								<div className="text-right text-[clamp(0.75rem,3vw,0.85rem)] text-text-muted shrink-0 space-y-1">
									<div className="font-medium">
										{g.open ? "Open" : "Request"}
									</div>
									<div>
										Created:{" "}
										{new Date(
											g.created_at
										).toLocaleDateString()}
									</div>
									<div>Location: --</div>
								</div>
							</div>
						</div>
					);
				})}

				{loading && (
					<p className="text-center text-text-muted py-4">Loading…</p>
				)}

				{error && (
					<p className="text-center text-red-500 py-4">{error}</p>
				)}
			</section>
		</main>
	);
}
