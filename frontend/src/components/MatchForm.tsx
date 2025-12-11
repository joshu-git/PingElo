"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchPlayers } from "@/lib/api";
import { Player } from "@/types/player";

//What we expect from backend
type MatchResult = {
    newRatingA: number;
    newRatingB: number;
    eloChangeA: number;
    eloChangeB: number;
    winner: string;
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

    //Fetches players from supabase
    useEffect(() => {
        fetchPlayers().then(setPlayers);
    }, []);

    //Uses match information
    async function submitMatch(e: React.FormEvent) {
        e.preventDefault();
        setResult(null);

        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
            alert("You must be logged in to submit a match");
            return;
        }

        if (!playerAId || !playerBId || playerAId === playerBId) {
            alert("Please select two different players");
            return;
        }

        //Tries to call the backend
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
                    scoreA: Number(scoreA),
                    scoreB: Number(scoreB),
                    gamePoints: Number(gamePoints),
                }),
            }
        );

        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || "Failed to submit match");
        }

        //Receive results from backend
        const matchResult: MatchResult = await res.json();
        setResult(matchResult);
    } catch (err) {
        console.error(err);
        alert("Failed to submit match");
    } finally {
        setLoading(false);
    }
  }

    //Displays match information
    return (
        <form onSubmit={submitMatch} style={{ maxWidth: 400 }}>
            <h1>Submit Match</h1>

            <select
                value={playerAId}
                onChange={(e) => setPlayerAId(e.target.value)}
            >
                <option value="">Player A</option>
                {players.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.username}
                    </option>
                ))}
            </select>

            <select
                value={playerBId}
                onChange={(e) => setPlayerBId(e.target.value)}
            >
                <option value="">Player B</option>
                {players.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.username}
                    </option>
                ))}
            </select>

            <input
                type="number"
                min={0}
                placeholder="Score A"
                value={scoreA}
                onChange={(e) => setScoreA(Number(e.target.value))}
            />

            <input
                type="number"
                min={0}
                placeholder="Score B"
                value={scoreB}
                onChange={(e) => setScoreB(Number(e.target.value))}
            />

            <input
                type="number"
                min={1}
                placeholder="Game Points"
                value={gamePoints}
                onChange={(e) => setGamePoints(Number(e.target.value))}
            />

            <button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit Match"}
            </button>

            {result && (
                <div style={{ marginTop: "1rem" }}>
                    <h2>Match Result</h2>

                    <p>
                        Player A:{" "}
                        <strong>
                            {result.eloChangeA > 0 && "+"}
                            {result.eloChangeA}
                        </strong>{" "}
                        → {result.newRatingA}
                    </p>

                    <p>
                        Player B:{" "}
                        <strong>
                            {result.eloChangeB > 0 && "+"}
                            {result.eloChangeB}
                        </strong>{" "}
                        → {result.newRatingB}
                    </p>

                    <p>Winner: Player {result.winner}</p>
                </div>
            )}
    </form>
  );
}

