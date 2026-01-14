"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Group = {
	id: string;
	group_name: string;
	member_count: number;
};

export default function Groups() {
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadGroups = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (!session) return;

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/groups`,
				{
					headers: {
						Authorization: `Bearer ${session.access_token}`,
					},
				}
			);

			const json = await res.json();
			setGroups(json.groups);
			setLoading(false);
		};

		loadGroups();
	}, []);

	if (loading) {
		return (
			<main className="max-w-5xl mx-auto px-4 py-16">
				<p className="text-center text-text-muted">Loading groups…</p>
			</main>
		);
	}

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			<section className="text-center space-y-2">
				<h1 className="text-4xl font-extrabold">Groups</h1>
				<p className="text-text-muted">
					Browse and join playing groups
				</p>
			</section>

			<section className="space-y-3">
				{groups.map((g) => (
					<Link
						key={g.id}
						href={`/groups/${g.id}`}
						className="block bg-card p-4 rounded-xl hover-card"
					>
						<div className="flex justify-between items-center">
							<span className="font-semibold">
								{g.group_name}
							</span>
							<span className="text-sm text-text-muted">
								{g.member_count} players
							</span>
						</div>
					</Link>
				))}
			</section>
		</main>
	);
}
