"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
	const router = useRouter();

	const [group, setGroup] = useState<GroupData | null>(null);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);

	/* ---------- Load group + players from Supabase ---------- */
	useEffect(() => {
		let cancelled = false;

		const loadGroup = async () => {
			setLoading(true);

			// Get current session
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const userId = session?.user.id;

			const { data, error } = await supabase
				.from("groups")
				.select("id, group_name, players(id, player_name, claim_code)")
				.eq("id", id)
				.single();

			if (error || !data) {
				router.push("/");
				return;
			}

			if (!cancelled) {
				const players: Player[] = (data.players ?? []).map((p) => ({
					id: p.id,
					player_name: p.player_name,
					claim_code: p.claim_code,
				}));

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

		loadGroup();
		return () => {
			cancelled = true;
		};
	}, [id, router]);

	/* ---------- Backend actions ---------- */
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

	/* ---------- Derived stats ---------- */
	const claimedCount = useMemo(() => {
		return group?.players.filter((p) => p.claim_code).length ?? 0;
	}, [group]);

	const unclaimedCount = useMemo(() => {
		return group ? group.players.length - claimedCount : 0;
	}, [group, claimedCount]);

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
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
					{group.group_name}
				</h1>
				<p className="text-text-muted">
					Players: {group.players.length} · Claimed: {claimedCount} ·
					Unclaimed: {unclaimedCount}
				</p>

				{!group.is_member && (
					<button
						onClick={joinGroup}
						disabled={actionLoading}
						className="px-6 py-2 rounded-lg bg-primary text-white font-semibold"
					>
						Join Group
					</button>
				)}
				{group.is_member && group.can_leave && (
					<button
						onClick={leaveGroup}
						disabled={actionLoading}
						className="px-6 py-2 rounded-lg bg-red-500 text-white font-semibold"
					>
						Leave Group
					</button>
				)}
				{group.is_member && !group.can_leave && (
					<p className="text-sm text-text-muted">
						The last claimed player cannot leave
					</p>
				)}
			</section>

			{/* PLAYERS GRID */}
			<section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
				{group.players.map((p) => (
					<div
						key={p.id}
						className="bg-card p-4 rounded-lg text-center shadow-sm"
					>
						<p className="font-medium">{p.player_name}</p>
						<p className="text-xs text-text-muted">
							{p.claim_code ? "Claimed" : "Unclaimed"}
						</p>
					</div>
				))}
			</section>

			{/* MATCHES */}
			<Matches matchType="singles" />
		</main>
	);
}
