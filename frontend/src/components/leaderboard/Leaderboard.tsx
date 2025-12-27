"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchLeaderboard } from "@/lib/api";
import { PlayersRow } from "@/types/database";

export default function Leaderboard() {
	const [players, setPlayers] = useState<PlayersRow[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchLeaderboard()
			.then((data) => setPlayers(data))
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div className="text-center text-white/60 mt-10">
				Loading leaderboard...
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto">
			<h1 className="text-3xl font-bold mb-6 text-center">Leaderboard</h1>

			<div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur shadow-lg overflow-hidden">
				<table className="w-full text-left">
					<thead className="bg-white/5 border-b border-white/10">
						<tr>
							<th className="px-4 py-3 text-white/70 font-medium">
								#
							</th>
							<th className="px-4 py-3 text-white/70 font-medium">
								Player
							</th>
							<th className="px-4 py-3 text-right text-white/70 font-medium">
								Elo
							</th>
						</tr>
					</thead>

					<tbody>
						{players.map((player, index) => {
							const rank = index + 1;

							const rankColor =
								rank === 1
									? "text-yellow-400"
									: rank === 2
									? "text-gray-300"
									: rank === 3
									? "text-amber-600"
									: "text-white";

							return (
								<tr
									key={player.id}
									className="border-b border-white/5 hover:bg-white/5 transition"
								>
									<td
										className={`px-4 py-3 font-bold ${rankColor}`}
									>
										{rank}
									</td>

									<td className="px-4 py-3">
										<Link
											href={`/profile/${player.player_name}`}
											className="hover:text-purple-300 transition font-medium"
										>
											{player.player_name}
										</Link>
									</td>

									<td className="px-4 py-3 text-right font-semibold text-white">
										{player.singles_elo}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
