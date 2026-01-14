"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Matches from "@/components/matches/Matches";

type Player = {
	id: string;
	player_name: string;
	is_claimed: boolean;
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

	/* ---------- Load group ---------- */
	useEffect(() => {
		let cancelled = false;

		const run = async () => {
			setLoading(true);

			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session || cancelled) return;

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/groups/${id}`,
				{
					headers: {
						Authorization: `Bearer ${session.access_token}`,
					},
				}
			);

			const json = await res.json();
			if (!cancelled) {
				setGroup(json);
				setLoading(false);
			}
		};

		run();

		return () => {
			cancelled = true;
		};
	}, [id]);

	/* ---------- Actions ---------- */
	const joinGroup = async () => {
		if (!group || actionLoading) return;
		setActionLoading(true);

		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session) return;

		await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${id}/join`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${session.access_token}`,
			},
		});

		setActionLoading(false);
		// reload via effect by updating local state
		setGroup(null);
	};

	const leaveGroup = async () => {
		if (!group || actionLoading) return;
		setActionLoading(true);

		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session) return;

		await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${id}/leave`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${session.access_token}`,
			},
		});

		setActionLoading(false);
		setGroup(null);
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
						You must claim your player before leaving this group
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
						{!p.is_claimed && (
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
