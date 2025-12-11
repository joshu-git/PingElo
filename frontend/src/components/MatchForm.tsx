
"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { fetchPlayers } from "@/lib/api";
import { Player } from "@/types/player";

//What we expect from backend
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

    //Fetch players from supabase
    useEffect(() => {
        fetchPlayers().then((p) => setPlayers(p || []));
    }, []);

    //Find username for winner
    const winnerName = useMemo(() => {
        if (!result) return null;

        const winnerId =
            result.winner === "A" ? playerAId : playerBId;

        return players.find((p) => p.id === winnerId)?.username ?? "Unknown";
    }, [result, players, playerAId, playerBId]);

    //Function for submitting the match
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
                const t = await res.text();
                throw new Error(t || "Failed to submit match");
            }

            const json = await res.json();
            if (!json.eloData) {
                alert("Unexpected server response.");
                return;
            }

            setResult(json.eloData as MatchResult);
        } catch (err) {
            console.error(err);
            alert("Failed to submit match.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form
            onSubmit={submitMatch}
            className="space-y-4 p-6 bg-black/40 rounded-xl border border-white/10 shadow-lg max-w-sm"
        >
            <h1 className="text-xl font-semibold mb-2">Submit Match</h1>

            {/* Player A */}
            <div>
                <label className="block mb-1 text-sm text-white/80">
                    Player A
                </label>
                <select
                    value={playerAId}
                    onChange={(e) => setPlayerAId(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">Select Player</option>
                    {players.map((p) => (
                        <option
                            key={p.id}
                            value={p.id}
                            disabled={p.id === playerBId}
                        >
                            {p.username}
                        </option>
                    ))}
                </select>
            </div>

            {/* Player B */}
            <div>
                <label className="block mb-1 text-sm text-white/80">
                    Player B
                </label>
                <select
                    value={playerBId}
                    onChange={(e) => setPlayerBId(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">Select Player</option>
                    {players.map((p) => (
                        <option
                            key={p.id}
                            value={p.id}
                            disabled={p.id === playerAId}
                        >
                            {p.username}
                        </option>
                    ))}
                </select>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block mb-1 text-sm text-white/80">
                        Score A
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={scoreA}
                        onChange={(e) => setScoreA(Number(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <label className="block mb-1 text-sm text-white/80">
                        Score B
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={scoreB}
                        onChange={(e) => setScoreB(Number(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Game points */}
            <div>
                <label className="block mb-1 text-sm text-white/80">
                    Game Points
                </label>
                <input
                    type="number"
                    min={1}
                    value={gamePoints}
                    onChange={(e) => setGamePoints(Number(e.target.value))}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg py-2 transition-all"
            >
                {loading ? "Submitting..." : "Submit Match"}
            </button>

            {/* Display match result */}
            {result && (
                <div className="mt-4 p-4 bg-black/30 border border-white/10 rounded-lg">
                    <h2 className="font-semibold mb-2">Match Result</h2>

                    <p>
                        Player A:{" "}
                        <strong>
                            {result.eloChangeA > 0 ? "+" : ""}
                            {result.eloChangeA}
                        </strong>{" "}
                        → {result.newRatingA}
                    </p>

                    <p>
                        Player B:{" "}
                        <strong>
                            {result.eloChangeB > 0 ? "+" : ""}
                            {result.eloChangeB}
                        </strong>{" "}
                        → {result.newRatingB}
                    </p>

                    <p className="mt-2">
                        Winner:{" "}
                        <span className="font-bold text-indigo-400">
                            {winnerName}
                        </span>
                    </p>
                </div>
            )}
        </form>
    );
}