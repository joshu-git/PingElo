"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Matches from "@/components/matches/Matches";

type Player = {
	id: string;
	player_name: string;
	claim_code: string | null;
};

type GroupData = {
	id: string;
	group_name: string;
	players: Player[];
	is_member: boolean;
	can_leave: boolean;
};

export default function Group() {
	const { id } = useParams<{ id: string }>();

	const [group, setGroup] = useState<GroupData | null>(null);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);

	/* ---------- Load group directly from Supabase ---------- */
	useEffect(() => {
		let cancelled = false;

		const run = async () => {
			setLoading(true);

			// Get current user session
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const userId = session?.user.id;

			// Fetch group + players
			const { data, error } = await supabase
				.from("groups")
				.select(
					`
          id,
          group_name,
          players(id, player_name, claim_code)
        `
				)
				.eq("id", id)
				.single();

			if (error) {
				console.error(error);
				setLoading(false);
				return;
			}

			if (!cancelled && data) {
				// Type for Supabase nested players
				type SupabasePlayer = {
					id: string;
					player_name: string;
					claim_code: string | null;
				};

				const players: Player[] = (data.players ?? []).map(
					(p: SupabasePlayer) => ({
						id: p.id,
						player_name: p.player_name,
						claim_code: p.claim_code,
					})
				);

				// Determine membership and if they can leave
				const is_member = players.some((p) => p.claim_code === userId);
				const claimedPlayers = players.filter((p) => p.claim_code);
				const can_leave = is_member && claimedPlayers.length > 1;

				setGroup({
					id: data.id,
					group_name: data.group_name,
					players,
					is_member,
					can_leave,
				});

				setLoading(false);
			}
		};

		run();

		return () => {
			cancelled = true;
		};
	}, [id]);

	/* ---------- Actions via backend ---------- */
	const joinGroup = async () => {
		if (!group || actionLoading) return;
		setActionLoading(true);

		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session) return;

		try {
			await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/groups/${id}/join`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${session.access_token}`,
					},
				}
			);

			setGroup(null); // force reload
		} catch (err) {
			console.error(err);
		} finally {
			setActionLoading(false);
		}
	};

	const leaveGroup = async () => {
		if (!group || actionLoading) return;
		setActionLoading(true);

		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session) return;

		try {
			await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/groups/${id}/leave`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${session.access_token}`,
					},
				}
			);

			setGroup(null); // force reload
		} catch (err) {
			console.error(err);
		} finally {
			setActionLoading(false);
		}
	};

	/* ---------- Render ---------- */
	if (loading || !group) {
		return (
			<main className="max-w-5xl mx-auto px-4 py-16">
				<p className="text-center text-text-muted">Loading group…</p>
			</main>
		);
	}

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HEADER */}
			<section className="text-center space-y-3">
				<h1 className="text-4xl md:text-5xl font-extrabold">
					{group.group_name}
				</h1>

				{!group.is_member && (
					<button
						onClick={joinGroup}
						disabled={actionLoading}
						className="px-4 py-2 rounded-lg"
					>
						Join Group
					</button>
				)}

				{group.is_member && group.can_leave && (
					<button
						onClick={leaveGroup}
						disabled={actionLoading}
						className="px-4 py-2 rounded-lg"
					>
						Leave Group
					</button>
				)}

				{group.is_member && !group.can_leave && (
					<p className="text-sm text-text-muted">
						The last claimed player cannot leave the group
					</p>
				)}
			</section>

			{/* PLAYERS */}
			<section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
				{group.players.map((p) => (
					<div
						key={p.id}
						className="bg-card p-3 rounded-lg text-center"
					>
						{p.player_name}
						{!p.claim_code && (
							<div className="text-xs text-text-muted">
								Unclaimed
							</div>
						)}
					</div>
				))}
			</section>

			{/* MATCHES */}
			<Matches matchType="singles" />
		</main>
	);
}
