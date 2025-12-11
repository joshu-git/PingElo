"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { fetchPlayers } from "@/lib/api";
import { Player } from "@/types/player";

// What we expect from backend
type MatchResult = {
    newRatingA: number;
    newRatingB: number;
    eloChangeA: number;
    eloChangeB: number;
    winner: "A" | "B";
};

export default function MatchForm() {
    const [players, setPlayers] = useState<Player[]>([]);

    const [playerAId, setPlayerAId] = useState("");
    const [playerBId, setPlayerBId] = useState("");

    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);
    const [gamePoints, setGamePoints] = useState(7);

    const [result, setResult] = useState<MatchResult | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch players
    useEffect(() => {
        fetchPlayers().then((p) => setPlayers(p || []));
    }, []);

    // Correct winner resolution
    const winnerName = useMemo(() => {
        if (!result) return null;

        const winnerId = result.winner === "A" ? playerAId : playerBId;
        return players.find((p) => p.id === winnerId)?.username ?? "Unknown";
    }, [result, players, playerAId, playerBId]);

    // Submit match
    async function submitMatch(e: React.FormEvent) {
        e.preventDefault();
        setResult(null);

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
            alert("You must be logged in to submit a match.");
            return;
        }

        if (!playerAId || !playerBId || playerAId === playerBId) {
            alert("Please select two different players.");
            return;
        }

        try {
            setLoading(true);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/matches/create`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${data.session.access_token}`,
                    },
                    body: JSON.stringify({
                        playerAId,
                        playerBId,
                        scoreA,
                        scoreB,
                        gamePoints,
                    }),
                }
            );

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Failed to submit match");
            }

            const json = await res.json();
            setResult(json.eloData as MatchResult);
        } catch (err) {
            console.error(err);
            alert("Failed to submit match.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full flex justify-center px-4 mt-6">
            <form
                onSubmit={submitMatch}
                className="
                    w-full
                    max-w-lg
                    sm:max-w-xl
                    md:max-w-2xl
                    bg-black/40
                    border border-white/10
                    rounded-2xl
                    p-6 sm:p-8
                    flex flex-col gap-5
                    shadow-xl
                "
            >
                <h1 className="text-3xl font-bold mb-2 text-center">
                    Submit Match
                </h1>

                {/* Player A */}
                <select
                    value={playerAId}
                    onChange={(e) => setPlayerAId(e.target.value)}
                    className="
                        bg-black/60 
                        border border-white/20 
                        rounded-xl 
                        p-3
                        text-white
                    "
                >
                    <option value="">Select Player A</option>
                    {players.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.username}
                        </option>
                    ))}
                </select>

                {/* Player B */}
                <select
                    value={playerBId}
                    onChange={(e) => setPlayerBId(e.target.value)}
                    className="
                        bg-black/60 
                        border border-white/20 
                        rounded-xl 
                        p-3
                        text-white
                    "
                >
                    <option value="">Select Player B</option>
                    {players.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.username}
                        </option>
                    ))}
                </select>

                {/* Scores */}
                <div className="grid grid-cols-2 gap-4">
                    <input
                        type="number"
                        min={0}
                        placeholder="Score A"
                        value={scoreA}
                        onChange={(e) => setScoreA(Number(e.target.value))}
                        className="bg-black/60 border border-white/20 rounded-xl p-3 text-white"
                    />

                    <input
                        type="number"
                        min={0}
                        placeholder="Score B"
                        value={scoreB}
                        onChange={(e) => setScoreB(Number(e.target.value))}
                        className="bg-black/60 border border-white/20 rounded-xl p-3 text-white"
                    />
                </div>

                {/* Game point cap */}
                <input
                    type="number"
                    min={1}
                    placeholder="Game Points"
                    value={gamePoints}
                    onChange={(e) => setGamePoints(Number(e.target.value))}
                    className="bg-black/60 border border-white/20 rounded-xl p-3 text-white"
                />

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="
                        w-full py-3 
                        bg-purple-600 
                        hover:bg-purple-700 
                        rounded-xl 
                        font-semibold 
                        transition 
                        text-white
                    "
                >
                    {loading ? "Submitting..." : "Submit Match"}
                </button>

                {/* Result */}
                {result && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                        <h2 className="text-xl font-semibold mb-2">
                            Match Result
                        </h2>

                        <p>
                            Player A:
                            <strong className="ml-1">
                                {result.eloChangeA > 0 && "+"}
                                {result.eloChangeA}
                            </strong>{" "}
                            → {result.newRatingA}
                        </p>

                        <p>
                            Player B:
                            <strong className="ml-1">
                                {result.eloChangeB > 0 && "+"}
                                {result.eloChangeB}
                            </strong>{" "}
                            → {result.newRatingB}
                        </p>

                        <p className="mt-1">
                            Winner:{" "}
                            <span className="font-bold text-purple-400">
                                {winnerName}
                            </span>
                        </p>
                    </div>
                )}
            </form>
        </div>
    );
}