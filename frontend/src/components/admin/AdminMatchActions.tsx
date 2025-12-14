"use client";

import { supabase } from "@/lib/supabase";

export default function AdminMatchActions({ matchId }: { matchId: string }) {
    //Checks the user is authenticated then sends a request
    async function authedFetch(path: string, options: RequestInit) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("Not authenticated");

        //Uses options supplied by delete and move
        return fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`,
            {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${data.session.access_token}`,
                },
            }
        );
    }

    //Function for deleting a match
    async function deleteMatch() {
        //Checks the user wants to delete it
        if (!confirm("Delete this match? This will recalculate Elo.")) return;

        //Sends the request to delete
        await authedFetch(`/admin/match/${matchId}/delete`, {
            method: "DELETE",
        });

        location.reload();
    }

    async function moveMatch() {
        //Asks the user where to move the match too
        const newPos = prompt("Move to match number:");
        if (!newPos) return;

        //Sends the request to move
        await authedFetch(`/admin/match/${matchId}/move`, {
            method: "POST",
            body: JSON.stringify({ newMatchNumber: Number(newPos) }),
        });

        location.reload();
    }

    return (
        <div className="flex gap-2 justify-center">
            <button
                onClick={moveMatch}
                className="px-2 py-1 bg-blue-600 rounded text-xs"
            >
                Move
            </button>
            <button
                onClick={deleteMatch}
                className="px-2 py-1 bg-red-600 rounded text-xs"
            >
                Delete
            </button>
        </div>
    );
}