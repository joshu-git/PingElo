import MatchDetailCard from "@/components/matches/MatchDetailCard";
import { supabase } from "@/lib/supabase";
import type { PlayerRow } from "@/types/players";

type MatchWithNames = {
  id: string;
  match_number: number;
  score_a: number;
  score_b: number;
  game_points: number;
  elo_change_a: number | null;
  elo_change_b: number | null;
  winner: string | null;
  player_a_id: string;
  player_b_id: string;
  player_a_username: string;
  player_b_username: string;
};

export default async function MatchPage({
  params,
}: {
  params: { id: string };
}) {
  //Fetch the match row (only IDs)
  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", params.id)
    .single();

  if (matchError || !matchData) {
    return (
      <div className="text-center mt-20 text-white">
        Match not found
      </div>
    );
  }

  //Fetch usernames for both players
  const { data: players } = await supabase
    .from("players")
    .select("id, username, elo")
    .in("id", [matchData.player_a_id, matchData.player_b_id]);

  const playerMap: Record<string, PlayerRow> = {};
  players?.forEach((p) => {
    playerMap[p.id] = p;
  });

  const match: MatchWithNames = {
    ...matchData,
    player_a_username: playerMap[matchData.player_a_id]?.username ?? "Unknown",
    player_b_username: playerMap[matchData.player_b_id]?.username ?? "Unknown",
  };

  return (
    <div className="max-w-xl mx-auto mt-10 px-4">
      <MatchDetailCard match={match} />
    </div>
  );
}