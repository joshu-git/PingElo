//For using supabase calls
import { supabase } from "../libs/supabase.js"

//For calculating elo post match
import { calculateElo, EloCalculationResult } from "./elo.services.js";

//Defines the return type
export interface MatchWithElo {
  match: any;
  eloData: EloCalculationResult;
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
    
    //Calls elo service to get new data
    const eloData = calculateElo({
        ratingA,
        ratingB,
        scoreA,
        scoreB,
        gamePoints
    });

    //Translate the winner into their ID
    const winnerId =
        eloData.winner === "A" ? playerAId : playerBId;

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
            winner: winnerId,
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