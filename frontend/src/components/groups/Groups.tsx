"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Group = {
	id: string;
	group_name: string;
	group_description?: string | null;
	group_owner_id?: string | null;
	open: boolean;
	created_at: string;
};

type PlayerRow = {
	id: string;
	player_name: string;
	account_id: string | null;
};

export default function Groups() {
	const [groups, setGroups] = useState<Group[]>([]);
	const [players, setPlayers] = useState<PlayerRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [groupsRes, playersRes] = await Promise.all([
					supabase
						.from("groups")
						.select(
							"id, group_name, group_description, group_owner_id, open, created_at"
						)
						.order("created_at", { ascending: false }),
					supabase
						.from("players")
						.select("id, player_name, account_id"),
				]);

				if (groupsRes.error) throw groupsRes.error;
				if (playersRes.error) throw playersRes.error;

				setGroups(groupsRes.data ?? []);
				setPlayers(playersRes.data ?? []);
			} catch (err) {
				console.error(err);
				setError("Failed to load groups.");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	/* Map account_id → player_name */
	const ownerMap = useMemo(() => {
		return new Map(
			players
				.filter((p) => p.account_id)
				.map((p) => [p.account_id as string, p.player_name])
		);
	}, [players]);

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HEADER */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">Groups</h1>
				<p className="text-text-muted">
					Community groups and their availability.
				</p>
			</section>

			{/* GROUP CARDS */}
			<section className="space-y-3">
				{loading && (
					<p className="text-center text-text-muted py-6">
						Loading groups…
					</p>
				)}

				{!loading && groups.length === 0 && (
					<p className="text-center text-text-muted py-6">
						No groups found.
					</p>
				)}

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
										{g.open ? "Open" : "Request Only"}
									</div>
									<div>
										Created:{" "}
										{new Date(
											g.created_at
										).toLocaleDateString()}
									</div>
									<div>Location</div>
								</div>
							</div>
						</div>
					);
				})}

				{error && (
					<p className="text-center text-red-500 py-4">
						Error loading groups: {error}
					</p>
				)}
			</section>
		</main>
	);
}
