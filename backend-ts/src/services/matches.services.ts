//For using supabase calls
import { supabase } from "../supabase.js"

//Allows the creation of matches
export async function createMatch(
    userId: string,
    playerAId: string,
    playerBId: string,
    scoreA: number,
    scoreB: number,
    gamePoints: number
) {
    //Insert match into database. Validation has been done
    const { data: match, error } = await supabase
        .from("matches")
        .insert({
            player_a_id: playerAId,
            player_b_id: playerBId,
            score_a: scoreA,
            score_b: scoreB,
            game_points: gamePoints,
            created_by: userId
        })
        .select()
        .single();

    //If there is a creation error then throw an error
    if (error || !match) {
        throw new Error(error?.message || "Failed to create match");
    }

    //Returns the match data to the route
    return match;
}