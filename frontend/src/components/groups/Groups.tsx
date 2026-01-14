"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Group = {
	id: string;
	group_name: string;
};

export default function Groups() {
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);

	/* ---------- Load all groups from Supabase ---------- */
	useEffect(() => {
		let cancelled = false;

		const run = async () => {
			setLoading(true);

			const { data, error } = await supabase
				.from("groups")
				.select("*")
				.order("group_name");

			if (error) {
				console.error(error);
				setLoading(false);
				return;
			}

			if (!cancelled) {
				setGroups(data ?? []);
				setLoading(false);
			}
		};

		run();

		return () => {
			cancelled = true;
		};
	}, []);

	/* ---------- Render ---------- */
	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">Groups</h1>
				<p className="text-text-muted">View all available groups.</p>
			</section>

			{loading && (
				<p className="text-center text-text-muted">Loading groups…</p>
			)}

			{!loading && (
				<section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
					{groups.map((g) => (
						<Link
							key={g.id}
							href={`/groups/${g.group_name}`}
							className="bg-card p-6 rounded-xl hover-card text-center"
						>
							<h2 className="text-lg font-semibold">
								{g.group_name}
							</h2>
						</Link>
					))}
				</section>
			)}
		</main>
	);
}
