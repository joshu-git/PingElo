import { supabase } from "@/lib/supabase";
import MatchDetailCard from "@/components/matches/MatchDetailCard";

//Display the MatchDetailCard
export default async function MatchPage({
  params,
}: {
  params: { id: string };
}) {
  const { data, error } = await supabase
    .from("matches")
    .select(`
      id,
      match_number,
      score_a,
      score_b,
      game_points,
      elo_change_a,
      elo_change_b,
      winner,
      player_a:players!matches_player_a_id_fkey(username),
      player_b:players!matches_player_b_id_fkey(username)
    `)
    .eq("id", params.id)
    .single();
    
    //Checks the match for errors and data
    if (error || !data) {
        return <p className="text-center mt-10">Match not found</p>;
    }

    //Normalize supabase relations
    const match = {
        ...data,
        player_a: data.player_a?.[0],
        player_b: data.player_b?.[0],
    };

    return (
        <div className="max-w-2xl mx-auto mt-10 px-4">
            <MatchDetailCard match={match} />
        </div>
    );
}