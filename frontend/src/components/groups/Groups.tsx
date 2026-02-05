"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type GroupRow = {
	id: string;
	group_name: string;
	group_description: string | null;
	group_owner_id: string | null;
	open: boolean;
	created_at: string;
};

type PlayerRow = {
	id: string;
	player_name: string;
	account_id: string | null;
};

type MatchRow = {
	group_id: string;
	created_at: string;
};

const PAGE_SIZE = 50;
const MAX_MATCH_FETCH = 1000;

export default function GroupsPage() {
	const router = useRouter();

	const [groups, setGroups] = useState<GroupRow[]>([]);
	const [players, setPlayers] = useState<PlayerRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);

	const [filter, setFilter] = useState<"all" | "open" | "request">("all");

	const cursorRef = useRef<string | null>(null);
	const fetchingRef = useRef(false);

	/* ------------------------------
	   LOAD PLAYERS (OWNER LOOKUP)
	------------------------------ */
	useEffect(() => {
		const loadPlayers = async () => {
			const { data } = await supabase
				.from("players")
				.select("id, player_name, account_id");

			if (data) setPlayers(data as PlayerRow[]);
		};

		loadPlayers();
	}, []);

	const playerByAccount = useMemo(
		() =>
			new Map(
				players
					.filter((p) => p.account_id)
					.map((p) => [p.account_id!, p])
			),
		[players]
	);

	/* ------------------------------
	   LOAD GROUPS (INFINITE)
	------------------------------ */
	const loadGroups = useCallback(
		async (reset: boolean) => {
			if (fetchingRef.current) return;
			if (!hasMore && !reset) return;

			fetchingRef.current = true;
			setLoading(true);

			if (reset) {
				cursorRef.current = null;
				setHasMore(true);
				setGroups([]);
			}

			let query = supabase
				.from("groups")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(PAGE_SIZE);

			if (cursorRef.current) {
				query = query.lt("created_at", cursorRef.current);
			}

			if (filter === "open") query = query.eq("open", true);
			if (filter === "request") query = query.eq("open", false);

			const { data } = await query;
			const newGroups = (data ?? []) as GroupRow[];

			if (newGroups.length < PAGE_SIZE) setHasMore(false);

			if (newGroups.length) {
				cursorRef.current = newGroups[newGroups.length - 1].created_at;
			}

			/* ---- latest match per group ---- */
			const groupIds = newGroups.map((g) => g.id);
			const latestMatchMap = new Map<string, string>();

			if (groupIds.length) {
				const { data: matches } = await supabase
					.from("matches")
					.select("group_id, created_at")
					.in("group_id", groupIds)
					.order("group_id", { ascending: true })
					.order("created_at", { ascending: false })
					.limit(MAX_MATCH_FETCH);

				(matches as MatchRow[] | null)?.forEach((m) => {
					if (!latestMatchMap.has(m.group_id)) {
						latestMatchMap.set(m.group_id, m.created_at);
					}
				});
			}

			const enriched = newGroups.map((g) => ({
				...g,
				last_activity: latestMatchMap.get(g.id) ?? g.created_at,
			}));

			enriched.sort(
				(a, b) =>
					new Date(b.last_activity).getTime() -
					new Date(a.last_activity).getTime()
			);

			setGroups((prev) => (reset ? enriched : [...prev, ...enriched]));

			setLoading(false);
			fetchingRef.current = false;
		},
		[filter, hasMore]
	);

	/* ------------------------------
	   RESET ON FILTER CHANGE (FIXED)
	------------------------------ */
	useEffect(() => {
		(async () => {
			await loadGroups(true);
		})();
	}, [filter, loadGroups]);

	/* ------------------------------
	   INFINITE SCROLL (MATCHES)
	------------------------------ */
	useEffect(() => {
		const onScroll = () => {
			if (
				fetchingRef.current ||
				!hasMore ||
				window.innerHeight + window.scrollY <
					document.body.offsetHeight - 300
			)
				return;

			loadGroups(false);
		};

		window.addEventListener("scroll", onScroll);
		return () => window.removeEventListener("scroll", onScroll);
	}, [hasMore, loadGroups]);

	/* ------------------------------
	   RENDER
	------------------------------ */
	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">Groups</h1>
				<p className="text-text-muted">
					Discover and join active groups.
				</p>
			</section>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				{/* Left Side */}
				<div className="flex flex-wrap items-center gap-2">
					<Link href="/groups/create">
						<button className="px-4 py-2 rounded-lg">
							Create Group
						</button>
					</Link>
					<Link href="/documentation/groups">
						<button className="px-4 py-2 rounded-lg">Guide</button>
					</Link>
					<button
						onClick={() => setFilter("all")}
						className={`px-4 py-2 rounded-lg ${
							filter === "all" ? "font-semibold underline" : ""
						}`}
					>
						All
					</button>
				</div>

				{/* Right Side */}
				<div className="flex flex-wrap items-center gap-2">
					<button
						onClick={() => setFilter("open")}
						className={`px-4 py-2 rounded-lg ${
							filter === "open" ? "font-semibold underline" : ""
						}`}
					>
						Open
					</button>
					<button
						onClick={() => setFilter("request")}
						className={`px-4 py-2 rounded-lg ${
							filter === "request"
								? "font-semibold underline"
								: ""
						}`}
					>
						Request
					</button>
					<button className="px-4 py-2 rounded-lg">Find Group</button>
				</div>
			</div>

			<section className="space-y-3">
				{groups.map((g) => {
					const owner = g.group_owner_id
						? playerByAccount.get(g.group_owner_id)
						: null;

					return (
						<div
							key={g.id}
							onClick={() =>
								router.push(`/groups/${g.group_name}`)
							}
							className="bg-card p-4 rounded-xl hover-card cursor-pointer transition"
						>
							<div className="flex justify-between gap-6">
								<div className="flex-1 min-w-0 space-y-1.5">
									<h2 className="font-semibold text-[clamp(1rem,4vw,1.125rem)] truncate">
										{g.group_name}
									</h2>

									<p className="text-text-subtle text-[clamp(0.8rem,3.5vw,0.875rem)] leading-snug line-clamp-2">
										{g.group_description?.trim() ||
											"No Description"}
									</p>

									{owner && (
										<p className="text-[clamp(0.75rem,3vw,0.85rem)] text-text-muted">
											Owner:{" "}
											<Link
												href={`/profile/${owner.player_name}`}
												onClick={(e) =>
													e.stopPropagation()
												}
												className="hover:underline"
											>
												{owner.player_name}
											</Link>
										</p>
									)}
								</div>

								<div className="text-right text-[clamp(0.75rem,3vw,0.85rem)] text-text-muted shrink-0 space-y-1">
									<div className="font-medium">
										{g.open ? "Open" : "Request Only"}
									</div>
									<div>
										Created:{" "}
										{new Date(
											g.created_at
										).toLocaleDateString()}
									</div>
									<div>Location: Coming Soon</div>
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
