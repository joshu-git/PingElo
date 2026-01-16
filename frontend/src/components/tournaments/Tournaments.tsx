"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Tournament = {
	id: string;
	tournament_name: string;
	started: boolean;
	completed: boolean;
	match_type: "singles" | "doubles";
	start_date: string;
};

export default function Tournaments() {
	const [tournaments, setTournaments] = useState<Tournament[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchTournaments() {
			const { data, error } = await supabase
				.from("tournaments")
				.select("*")
				.order("created_at", { ascending: false });

			if (!error && data) setTournaments(data);
			setLoading(false);
		}

		fetchTournaments();
	}, []);

	if (loading) {
		return <div className="p-6 text-gray-400">Loading tournaments...</div>;
	}

	return (
		<div className="p-6 max-w-5xl mx-auto">
			<h1 className="text-3xl font-bold mb-6">Tournaments</h1>

			<div className="space-y-4">
				{tournaments.map((t) => (
					<a
						key={t.id}
						href={`/tournaments/${t.id}`}
						className="block rounded-xl border border-white/10 p-4 hover:bg-white/5 transition"
					>
						<div className="flex justify-between items-center">
							<div>
								<h2 className="text-xl font-semibold">
									{t.tournament_name}
								</h2>
								<p className="text-sm text-gray-400">
									{t.match_type.toUpperCase()} ·{" "}
									{t.completed
										? "Completed"
										: t.started
										? "In Progress"
										: "Upcoming"}
								</p>
							</div>

							<span className="text-sm text-gray-500">
								{new Date(t.start_date).toLocaleDateString()}
							</span>
						</div>
					</a>
				))}
			</div>
		</div>
	);
}
