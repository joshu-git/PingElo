//For using supabase calls
import { supabase } from "../supabase.js"

//For calculating elo post match
import { EloResponse, calculateElo } from "./elo.services.js";

//Defines the return type
export interface MatchWithElo {
  match: any;
  eloData: EloResponse;
}

//Allows the creation of matches
export async function createMatch(
    userId: string,
    playerAId: string,
    playerBId: string,
    scoreA: number,
    scoreB: number,
    gamePoints: number,
    ratingA: number,
    ratingB: number
): Promise<MatchWithElo> {
    //Calls leo service to get new data
    const eloData = await calculateElo({
        playerAId,
        playerBId,
        ratingA,
        ratingB,
        scoreA,
        scoreB,
        gamePoints
    });

    //Insert match into database. Validation has been done
    const { data: match, error } = await supabase
        .from("matches")
        .insert({
            player_a_id: playerAId,
            player_b_id: playerBId,
            score_a: scoreA,
            score_b: scoreB,
            game_points: gamePoints,
            created_by: userId,
            winner: eloData.winner,
            elo_change_a: eloData.eloChangeA,
            elo_change_b: eloData.eloChangeB
        })
        .select()
        .single();

    //If there is a creation error then throw an error
    if (error || !match) {
        throw new Error(error?.message || "Failed to create match");
    }

    //Update player ratings in players table with new elo
    const { error: updateAError } = await supabase
        .from("players")
        .update({ elo: eloData.newRatingA })
        .eq("id", playerAId);

    const { error: updateBError } = await supabase
        .from("players")
        .update({ elo: eloData.newRatingB })
        .eq("id", playerBId);

    //If there is an update error then throw an error
    if (updateAError || updateBError) {
        throw new Error(
            updateAError?.message || updateBError?.message || "Failed to update Elo"
        );
    }

    //Returns the match and elo data to the route
    return { match, eloData };
}