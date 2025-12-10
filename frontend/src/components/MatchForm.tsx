"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchPlayers } from "@/lib/api";
import { Player } from "@/types/player";

export default function MatchForm() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [playerAId, setPlayerAId] = useState("");
    const [playerBId, setPlayerBId] = useState("");
    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);
    const [gamePoints, setGamePoints] = useState(0);

    useEffect(() => {
        fetchPlayers().then(setPlayers);
    }, []);

    async function submitMatch(e: React.FormEvent) {
        e.preventDefault();

        const { data: { session } } = await supabase.auth.getSession();

        //Confirms the user is logged in
        if (!session) {
            alert("You must be logged in");
            return;
        }

        //Calls the typescript backend
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/matches/create`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                playerAId,
                playerBId,
                scoreA,
                scoreB,
                gamePoints
            }),
        });

        //Tells the user if it was successful
        if (!res.ok) {
            alert("Failed to submit match");
        } else {
            alert("Match submitted!");
        }
    }

    //Displays match information
    return (
        <form onSubmit={submitMatch}>
            <h1>Submit Match</h1>

            <select value={playerAId} onChange={e => setPlayerAId(e.target.value)}>
                <option value="">Player A</option>
                {players.map(p => (
                    <option key={p.id} value={p.id}>{p.username}</option>
                ))}
            </select>

            <select value={playerBId} onChange={e => setPlayerBId(e.target.value)}>
                <option value="">Player B</option>
                {players.map(p => (
                    <option key={p.id} value={p.id}>{p.username}</option>
                ))}
            </select>

            <input type="number" value={scoreA} onChange={e => setScoreA(+e.target.value)} />
            <input type="number" value={scoreB} onChange={e => setScoreB(+e.target.value)} />
            <input type="number" value={gamePoints} onChange={e => setGamePoints(+e.target.value)} />

            <button type="submit">Submit</button>
        </form>
  );
}
