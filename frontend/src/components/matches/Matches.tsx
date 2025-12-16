"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 25;

type Player = {
  id: string;
  username: string;
};

type MatchRow = {
  id: string;
  created_at: string;
  score_a: number;
  score_b: number;
  elo_change_a: number;
  elo_change_b: number;
  winner: "A" | "B";
  player_a: Player[];
  player_b: Player[];
};

type Match = {
  id: string;
  created_at: string;
  scoreA: number;
  scoreB: number;
  eloA: number;
  eloB: number;
  winner: "A" | "B";
  playerA: Player;
  playerB: Player;
};

type Props = {
  variant?: "global" | "profile" | "admin";
  highlightPlayerId?: string;
  showSubmitButton?: boolean;
};

export default function Matches({
  variant = "global",
  highlightPlayerId,
  showSubmitButton = false,
}: Props) {
  const router = useRouter();
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [winnerFilter, setWinnerFilter] = useState<"" | "A" | "B">("");

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    let query = supabase
      .from("matches")
      .select(
        `
        id,
        created_at,
        score_a,
        score_b,
        elo_change_a,
        elo_change_b,
        winner,
        player_a:player_a_id ( id, username ),
        player_b:player_b_id ( id, username )
      `
      )
      .order("created_at", { ascending: false })
      .range(matches.length, matches.length + PAGE_SIZE - 1);

    if (winnerFilter) {
      query = query.eq("winner", winnerFilter);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error(error);
      setLoading(false);
      return;
    }

    const normalized: Match[] = (data as MatchRow[]).map((m) => ({
      id: m.id,
      created_at: m.created_at,
      scoreA: m.score_a,
      scoreB: m.score_b,
      eloA: m.elo_change_a,
      eloB: m.elo_change_b,
      winner: m.winner,
      playerA: m.player_a[0],
      playerB: m.player_b[0],
    }));

    setMatches((prev) => [...prev, ...normalized]);
    setHasMore(data.length === PAGE_SIZE);
    setLoading(false);
  }, [matches.length, hasMore, loading, winnerFilter]);

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

  function outline(playerId: string, won: boolean) {
    if (variant !== "profile" || highlightPlayerId !== playerId)
      return "border-white/10";
    return won ? "border-green-500/30" : "border-red-500/30";
  }

  function handleWinnerFilterChange(
    value: "" | "A" | "B"
  ) {
    setWinnerFilter(value);
    setMatches([]);
    setHasMore(true);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Matches</h1>

        <div className="flex gap-3">
          <select
            value={winnerFilter}
            onChange={(e) =>
              handleWinnerFilterChange(
                e.target.value as "" | "A" | "B"
              )
            }
            className="bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Winners</option>
            <option value="A">Player A Wins</option>
            <option value="B">Player B Wins</option>
          </select>

          {showSubmitButton && (
            <Link href="/matches/submit">
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold">
                Submit Match
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Matches */}
      <div className="space-y-3">
        {matches.map((m) => (
          <div
            key={m.id}
            onClick={() => router.push(`/match/${m.id}`)}
            className={clsx(
              "bg-black/40 border rounded-2xl p-4 cursor-pointer transition hover:bg-black/50",
              outline(m.playerA.id, m.winner === "A"),
              outline(m.playerB.id, m.winner === "B")
            )}
          >
            <div className="flex justify-between items-center gap-6">
              {/* Players */}
              <div className="flex flex-col gap-1 min-w-[220px]">
                {[
                  { p: m.playerA, elo: m.eloA },
                  { p: m.playerB, elo: m.eloB },
                ].map(({ p, elo }) => (
                  <Link
                    key={p.id}
                    href={`/profile/${p.username}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline font-medium"
                  >
                    {p.username}
                    <span
                      className={`ml-2 text-sm ${
                        elo >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {elo > 0 && "+"}
                      {elo}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Scores */}
              <div className="flex flex-col items-center font-semibold">
                <span>{m.scoreA}</span>
                <span>{m.scoreB}</span>
              </div>

              {/* Meta */}
              <div className="text-right text-sm text-gray-400">
                <div className="text-white font-medium">
                  Winner:{" "}
                  {m.winner === "A"
                    ? m.playerA.username
                    : m.playerB.username}
                </div>
                <div>
                  {new Date(m.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loader */}
      <div ref={loaderRef} className="h-10 flex justify-center items-center">
        {loading && <span className="text-gray-400">Loading…</span>}
        {!hasMore && (
          <span className="text-gray-500 text-sm">No more matches</span>
        )}
      </div>
    </div>
  );
}