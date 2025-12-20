"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { supabase } from "@/lib/supabase";

//Determines how many matches are loaded in
const PAGE_SIZE = 50;

type MatchRow = {
    id: string;
    created_at: string;
    player_a1_id: string;
    player_b1_id: string;
    score_a: number;
    score_b: number;
    elo_before_a1: number;
    elo_before_b1: number;
    elo_change_a: number;
    elo_change_b: number;
    winner1: string;
};

type Props = {
    variant?: "global" | "profile" | "admin";
    highlightPlayerId?: string;
};

export default function Matches({ variant = "global", highlightPlayerId }: Props) {
    const router = useRouter();
    const loaderRef = useRef<HTMLDivElement | null>(null);

    const [matches, setMatches] = useState<MatchRow[]>([]);
    const [players, setPlayers] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [highestGameNumber, setHighestGameNumber] = useState<number | null>(null);

    //Load all players
    useEffect(() => {
        async function loadPlayers() {
            const { data } = await supabase
                .from("players")
                .select("id, player_name");

            //If there are no players return
            if (!data) return;
            
            //Else map the players
            setPlayers(new Map(data.map((p) => [p.id, p.player_name])));
        }

        //Calls loadPlayers
        loadPlayers();
    }, []);

    //Fetch the highest game number
    useEffect(() => {
        async function fetchHighestGameNumber() {
            let query = supabase.from("matches").select("id", { count: "exact", head: true });

            if (variant === "profile" && highlightPlayerId) {
                query = supabase
                    .from("matches")
                    .select("id", { count: "exact", head: true })
                    .or(`player_a1_id.eq.${highlightPlayerId},player_b2_id.eq.${highlightPlayerId}`);
            }

            const { count, error } = await query;
            if (!error && count !== null) {
                setHighestGameNumber(count);
            }
        }
        fetchHighestGameNumber();
    }, [variant, highlightPlayerId]);

    // Load matches (paginated)
    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);

        const { data, error } = await supabase
            .from("matches")
            .select(
                `
                id,
                created_at,
                player_a1_id,
                player_b1_id,
                score_a,
                score_b,
                elo_before_a1,
                elo_before_b1,
                elo_change_a,
                elo_change_b,
                winner1
            `
            )
            .order("created_at", { ascending: false })
            .range(matches.length, matches.length + PAGE_SIZE - 1);

        if (error || !data) {
            console.error(error);
            setLoading(false);
            return;
        }

        setMatches((prev) => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
        setLoading(false);
    }, [matches.length, loading, hasMore]);

    // Infinite scroll
    useEffect(() => {
        const el = loaderRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => entry.isIntersecting && loadMore(),
            { threshold: 1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [loadMore]);

    // Outline for profile view (green if highlighted player won, red if lost)
    function outline(playerId: string, winnerId: string) {
        if (variant !== "profile" || !highlightPlayerId) return "border-white/10";
        if (highlightPlayerId !== playerId) return "border-white/10";
        return highlightPlayerId === winnerId ? "border-green-500/30" : "border-red-500/30";
    }

        return (
        <div className="w-full flex justify-center px-4 mt-12">
            <div className="w-full max-w-2xl space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                        Matches{highestGameNumber ? ` (${highestGameNumber})` : ""}
                    </h1>

                    <Link href="/matches/submit">
                        <button className="px-4 py-2 rounded-lg w-full sm:w-auto">
                            Submit Match
                        </button>
                    </Link>
                </div>

                {/* Matches */}
                <div className="space-y-4">
                    {matches.map((m) => {
                        const aName = players.get(m.player_a1_id) ?? "Unknown";
                        const bName = players.get(m.player_b1_id) ?? "Unknown";

                        const aEloAfter = m.elo_before_a1 + m.elo_change_a;
                        const bEloAfter = m.elo_before_b1 + m.elo_change_b;

                        return (
                            <div
                                key={m.id}
                                onClick={() => router.push(`/matches/${m.id}`)}
                                className={clsx(
                                    "bg-card border border-border rounded-xl p-4 sm:p-5 cursor-pointer hover-card transition",
                                    outline(m.player_a1_id, m.winner1),
                                    outline(m.player_b1_id, m.winner1)
                                )}
                            >
                                <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">

                                    {/* Players */}
                                    <div className="flex flex-col gap-2 min-w-0 flex-1">
                                        <Link
                                            href={`/profile/${aName}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex justify-between items-center hover:underline"
                                        >
                                            <span className="truncate font-medium">
                                                {aName} ({aEloAfter})
                                            </span>
                                            <span className="text-sm text-text-subtle w-12 text-right">
                                                {m.elo_change_a > 0 && "+"}{m.elo_change_a}
                                            </span>
                                        </Link>

                                        <Link
                                            href={`/profile/${bName}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex justify-between items-center hover:underline"
                                        >
                                            <span className="truncate font-medium">
                                                {bName} ({bEloAfter})
                                            </span>
                                            <span className="text-sm text-text-subtle w-12 text-right">
                                                {m.elo_change_b > 0 && "+"}{m.elo_change_b}
                                            </span>
                                        </Link>
                                    </div>

                                    {/* Score */}
                                    <div className="flex sm:flex-col justify-center items-center gap-2 sm:gap-0 font-semibold text-lg">
                                        <span>{m.score_a}</span>
                                        <span className="text-text-muted">{m.score_b}</span>
                                    </div>

                                    {/* Meta */}
                                    <div className="text-sm text-text-subtle text-left sm:text-right">
                                        <div className="font-medium text-text">
                                            Winner: {players.get(m.winner1) ?? "Unknown"}
                                        </div>
                                        <div>
                                            {new Date(m.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Loader */}
                <div ref={loaderRef} className="h-12 flex justify-center items-center">
                    {loading && <span className="text-text-muted">Loading…</span>}
                    {!hasMore && (
                        <span className="text-text-subtle text-sm">
                            No more matches
                        </span>
                    )}
                </div>

            </div>
        </div>
    );
}