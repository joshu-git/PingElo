"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 25;

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
  winner: string; // winner id
};

type Props = {
  variant?: "global" | "profile" | "admin";
  highlightPlayerId?: string;
};

export default function Matches({
  variant = "global",
  highlightPlayerId,
}: Props) {
  const router = useRouter();
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [players, setPlayers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Load players
  useEffect(() => {
    async function loadPlayers() {
      const { data } = await supabase
        .from("players")
        .select("id, username");
      if (!data) return;
      setPlayers(new Map(data.map((p) => [p.id, p.username])));
    }
    loadPlayers();
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const { data, error } = await supabase
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

  function outline(playerId: string) {
    if (variant !== "profile" || highlightPlayerId !== playerId) return "border-white/10";
    const isWinner = highlightPlayerId === playerId;
    return isWinner ? "border-green-500/30" : "border-red-500/30";
  }

  function resetMatches() {
    setMatches([]);
    setHasMore(true);
  }

  return (
    <div className="w-full flex justify-center px-4 mt-6">
      <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <h1 className="text-2xl font-bold">Matches</h1>
          <Link href="/matches/submit">
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold text-white transition">
              Submit Match
            </button>
          </Link>
        </div>

        {/* Matches */}
        <div className="space-y-3">
          {matches.map((m) => {
            const aName = players.get(m.player_a_id) ?? "Unknown";
            const bName = players.get(m.player_b_id) ?? "Unknown";

            const aEloAfter = m.elo_before_a + m.elo_change_a;
            const bEloAfter = m.elo_before_b + m.elo_change_b;

            return (
              <div
                key={m.id}
                onClick={() => router.push(`/match/${m.id}`)}
                className={clsx(
                  "bg-black/40 border rounded-2xl p-4 cursor-pointer transition hover:bg-black/50",
                  outline(m.player_a_id),
                  outline(m.player_b_id)
                )}
              >
                <div className="flex justify-between items-center gap-6">
                  {/* Players + Elo */}
                  <div className="flex flex-col gap-1 w-56">
                    <Link
                      href={`/profile/${aName}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline font-medium flex justify-between items-center w-full"
                    >
                      <span className="truncate">{aName} ({aEloAfter})</span>
                      <span className="text-gray-400 ml-2 flex-shrink-0 w-12 text-right">
                        {m.elo_change_a > 0 && "+"}{m.elo_change_a}
                      </span>
                    </Link>

                    <Link
                      href={`/profile/${bName}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline font-medium flex justify-between items-center w-full"
                    >
                      <span className="truncate">{bName} ({bEloAfter})</span>
                      <span className="text-gray-400 ml-2 flex-shrink-0 w-12 text-right">
                        {m.elo_change_b > 0 && "+"}{m.elo_change_b}
                      </span>
                    </Link>
                  </div>

                  {/* Scores */}
                  <div className="flex flex-col items-center font-semibold w-12 flex-shrink-0">
                    <span>{m.score_a}</span>
                    <span>{m.score_b}</span>
                  </div>

                  {/* Meta */}
                  <div className="text-right text-sm text-gray-400">
                    <div className="text-white font-medium">
                      Winner: {players.get(m.winner) ?? "Unknown"}
                    </div>
                    <div>{new Date(m.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loader */}
        <div ref={loaderRef} className="h-10 flex justify-center items-center">
          {loading && <span className="text-gray-400">Loading…</span>}
          {!hasMore && <span className="text-gray-500 text-sm">No more matches</span>}
        </div>
      </div>
    </div>
  );
}