"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/router";

//Function for claiming a player
export default function Claim() {
    const router = useRouter();
    const [claimCode, setClaimCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    //Uses claim information
    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const { data, error } = await supabase.auth.getSession();
            if (error || !data.session) {
                throw new Error("You must be logged in.");
            }

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/players/claim`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${data.session.access_token}`,
                    },
                    body: JSON.stringify({ claimCode }),
                }
            );

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Claim failed.");
            }

            setMessage(`Player claimed: ${json.player.username}`);

            router.push(`/profile/${json.player.username}`);
        } catch (err: unknown) {
            if (err instanceof Error) {
                throw new Error(err.message);
            }
            throw new Error("Unknown error occurred");
        } finally {
            setLoading(false);
        }
    }

    //Displays claim information
    return (
        <div className="w-full flex justify-center mt-10">
            <form
                onSubmit={submit}
                className="
                    w-full
                    max-w-md
                    sm:max-w-lg
                    md:max-w-xl
                    bg-black/40
                    border border-white/10
                    rounded-xl
                    p-6
                    shadow-lg
                    flex flex-col
                    gap-4
                "
            >
                <h1 className="text-2xl font-bold text-center mb-2">Claim Player</h1>

                {message && (
                    <p className="text-center text-sm text-purple-300">{message}</p>
                )}

                <input
                    type="text"
                    placeholder="Claim Code"
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value)}
                    required
                    className="bg-black/60 border border-white/20 rounded-lg p-3"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition text-white"
                >
                    {loading ? "Claiming..." : "Claim Player"}
                </button>
            </form>
        </div>
    );
}