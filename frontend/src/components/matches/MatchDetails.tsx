"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type MatchRow = {
    id: string;
    created_at: string;
    player_a_id: string;
    player_b_id: string;
    score_a: number;
    score_b: number;
    elo_before_a: number;
    elo_before_b: number;
    elo_change_a: number;
    elo_change_b: number;
    winner: string;
};

export default function MatchDetail({ matchId }: { matchId: string }) {
    const [match, setMatch] = useState<MatchRow | null>(null);
    const [players, setPlayers] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);

            // Fetch match WITHOUT .single()
            const { data: matches, error } = await supabase
                .from("matches")
                .select(
                    `
                    id,
                    created_at,
                    player_a_id,
                    player_b_id,
                    score_a,
                    score_b,
                    elo_before_a,
                    elo_before_b,
                    elo_change_a,
                    elo_change_b,
                    winner
                `
                )
                .eq("id", matchId)
                .limit(1);

            if (error || !matches || matches.length === 0) {
                setMatch(null);
                setLoading(false);
                return;
            }

            const match = matches[0];
            setMatch(match);

            // Fetch players
            const { data: playersData } = await supabase
                .from("players")
                .select("id, username")
                .in("id", [match.player_a_id, match.player_b_id, match.winner]);

            if (playersData) {
                setPlayers(new Map(playersData.map((p) => [p.id, p.username])));
            }

            setLoading(false);
        }

        load();
    }, [matchId]);

    if (loading) {
        return (
            <div className="mt-10 text-center text-gray-400">
                Loading match…
            </div>
        );
    }

    if (!match) {
        return (
            <div className="mt-10 text-center text-gray-400">
                Match not found
            </div>
        );
    }

    const aName = players.get(match.player_a_id) ?? "Unknown";
    const bName = players.get(match.player_b_id) ?? "Unknown";

    const aAfter = match.elo_before_a + match.elo_change_a;
    const bAfter = match.elo_before_b + match.elo_change_b;

    return (
        <div className="w-full flex justify-center px-4 mt-6">
            <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl bg-black/40 border border-white/10 rounded-2xl p-6 space-y-4">
                <Link href="/matches" className="text-sm text-gray-400 hover:underline">
                    ← Back to matches
                </Link>

                <h1 className="text-2xl font-bold text-center">
                    Match Details
                </h1>

                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span>{aName} ({aAfter})</span>
                        <span className="text-gray-400">
                            {match.elo_change_a > 0 && "+"}
                            {match.elo_change_a}
                        </span>
                    </div>

                    <div className="flex justify-center font-semibold">
                        {match.score_a} – {match.score_b}
                    </div>

                    <div className="flex justify-between">
                        <span>{bName} ({bAfter})</span>
                        <span className="text-gray-400">
                            {match.elo_change_b > 0 && "+"}
                            {match.elo_change_b}
                        </span>
                    </div>
                </div>

                <div className="text-sm text-gray-400 text-center">
                    Winner: {players.get(match.winner) ?? "Unknown"}
                    <br />
                    {new Date(match.created_at).toLocaleString()}
                </div>
            </div>
        </div>
    );
}