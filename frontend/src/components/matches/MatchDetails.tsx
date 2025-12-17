"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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

type Player = {
    id: string;
    username: string;
};

export default function MatchDetails({ matchId }: { matchId: string }) {
    const [match, setMatch] = useState<MatchRow | null>(null);
    const [players, setPlayers] = useState<Map<string, Player>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const { data: matchData, error } = await supabase
                .from("matches")
                .select("*")
                .eq("id", matchId)
                .single();

            if (error || !matchData) {
                setLoading(false);
                return;
            }

            const { data: playersData } = await supabase
                .from("players")
                .select("id, username")
                .in("id", [matchData.player_a_id, matchData.player_b_id]);

            const map = new Map<string, Player>();
            playersData?.forEach((p) => map.set(p.id, p));

            setPlayers(map);
            setMatch(matchData);
            setLoading(false);
        }

        load();
    }, [matchId]);

    if (loading) {
        return (
            <div className="flex justify-center mt-12 text-gray-400">
                Loading match…
            </div>
        );
    }

    if (!match) {
        return (
            <div className="flex justify-center mt-12 text-red-400">
                Match not found
            </div>
        );
    }

    const playerA = players.get(match.player_a_id);
    const playerB = players.get(match.player_b_id);

    const aEloAfter = match.elo_before_a + match.elo_change_a;
    const bEloAfter = match.elo_before_b + match.elo_change_b;

    return (
        <div className="w-full flex justify-center px-4 mt-8">
            <div className="w-full max-w-md sm:max-w-lg md:max-w-xl space-y-6">
                <h1 className="text-2xl font-bold text-center">
                    Match Details
                </h1>

                <div className="bg-black/40 border border-white/10 rounded-2xl p-6 space-y-4">
                    {/* Player A */}
                    <div className="flex justify-between items-center">
                        <Link
                            href={`/profile/${playerA?.username}`}
                            className="font-medium hover:underline truncate"
                        >
                            {playerA?.username ?? "Unknown"} ({aEloAfter})
                        </Link>

                        <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="text-lg font-semibold">
                                {match.score_a}
                            </span>
                            <span className="text-gray-400 w-12 text-right">
                                {match.elo_change_a > 0 && "+"}
                                {match.elo_change_a}
                            </span>
                        </div>
                    </div>

                    {/* Player B */}
                    <div className="flex justify-between items-center">
                        <Link
                            href={`/profile/${playerB?.username}`}
                            className="font-medium hover:underline truncate"
                        >
                            {playerB?.username ?? "Unknown"} ({bEloAfter})
                        </Link>

                        <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="text-lg font-semibold">
                                {match.score_b}
                            </span>
                            <span className="text-gray-400 w-12 text-right">
                                {match.elo_change_b > 0 && "+"}
                                {match.elo_change_b}
                            </span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 text-sm text-gray-400 text-center">
                        Winner:{" "}
                        <span className="text-white font-medium">
                            {players.get(match.winner)?.username ?? "Unknown"}
                        </span>
                        <div>
                            {new Date(match.created_at).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}