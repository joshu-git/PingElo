"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

import { EloChart } from "@/components/matches/EloChart";
import ProfileStats from "./ProfileStats";
import ProfileMatchList from "./ProfileMatchList";

import type { MatchRow } from "@/types/matches";
import type { PlayerRow } from "@/types/players";

type MatchWithPlayers = MatchRow & {
  player_a: { username: string };
  player_b: { username: string };
};

export default function ProfileView() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();

  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      /* -------------------------
         FETCH PLAYER
      -------------------------- */
      const { data: playerData } = await supabase
        .from("players")
        .select("*")
        .eq("username", username)
        .single();

      if (!playerData) {
        router.push("/");
        return;
      }

      setPlayer(playerData);

      /* -------------------------
         FETCH MATCHES
      -------------------------- */
      const { data: matchData } = await supabase
        .from("matches")
        .select(`
          *,
          player_a:players!matches_player_a_id_fkey(username),
          player_b:players!matches_player_b_id_fkey(username)
        `)
        .or(
          `player_a_id.eq.${playerData.id},player_b_id.eq.${playerData.id}`
        )
        .order("match_number", { ascending: true });

      // Normalize joined relations (Supabase returns arrays)
      const normalized =
        matchData?.map((m) => ({
          ...m,
          player_a: m.player_a[0],
          player_b: m.player_b[0],
        })) ?? [];

      setMatches(normalized);

      /* -------------------------
         CHECK ADMIN
      -------------------------- */
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        const { data } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.session.user.id)
          .single();

        setIsAdmin(Boolean(data?.is_admin));
      }
    }

    load();
  }, [username, router]);

  /* -------------------------
     ELO HISTORY
  -------------------------- */
  const eloHistory = useMemo(() => {
    if (!player) return [];

    return matches
      .map((m) => {
        const isA = m.player_a_id === player.id;
        const before = isA ? m.elo_before_a : m.elo_before_b;
        const change = isA ? m.elo_change_a : m.elo_change_b;

        if (before === null || change === null) return null;

        return {
          match: m.match_number,
          elo: before + change,
        };
      })
      .filter(Boolean) as { match: number; elo: number }[];
  }, [matches, player]);

  if (!player) return null;

  return (
    <div className="max-w-5xl mx-auto mt-10 px-4 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">{player.username}</h1>

        {isAdmin && (
          <Link
            href="/admin"
            className="px-4 py-2 bg-purple-600 rounded-xl hover:bg-purple-700 transition"
          >
            Admin Dashboard
          </Link>
        )}
      </div>

      <ProfileStats playerId={player.id} matches={matches} />

      {/* Elo Chart */}
      <div className="bg-black/40 rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">
          Elo Over Time
        </h2>
        <EloChart data={eloHistory} />
      </div>

      <ProfileMatchList matches={matches} />
    </div>
  );
}