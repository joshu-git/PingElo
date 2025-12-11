"use client";

import { useEffect, useState } from "react";
import { fetchLeaderboard } from "@/lib/api";
import { Player } from "@/types/player";

export default function Leaderboard() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard()
        .then((data) => setPlayers(data))
        .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <p className="text-center text-gray-500">Loading leaderboard...</p>;
    }

    return (
        <div className="max-w-xl mx-auto">
            <h1 className="text-3xl font-bold mb-4 text-center">🏆 Leaderboard</h1>

            <table className="w-full border-collapse shadow border rounded-lg overflow-hidden">
            <thead>
                <tr className="bg-gray-100 text-left border-b">
                    <th className="p-3">#</th>
                    <th className="p-3">Player</th>
                    <th className="p-3 text-right">Elo</th>
                </tr>
            </thead>

            <tbody>
                {players.map((player, index) => (
                    <tr key={player.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{index + 1}</td>
                        <td className="p-3">{player.username}</td>
                        <td className="p-3 text-right font-semibold">{player.elo}</td>
                    </tr>
                ))}
            </tbody>
            </table>
        </div>
    );
}