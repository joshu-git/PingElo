//For using supabase calls
import { supabase } from "../supabase.js";

//For generating claim codes
import { v4 as uuidv4 } from "uuid";

//Used for creating a claimable player
export async function createPlayer(
    username: string
) {
    //Generate a unique claim code for the player
    const claimCode = uuidv4().slice(0, 6).toUpperCase();

    //Create the new player in players
    const { data, error } = await supabase
        .from("players")
        .insert({
            username: username,
            claim_code: claimCode,
            user_id: null
        })
        .select()
        .single();
    
    //If there was an error or there is no data returned
    if (error || !data) {
        throw new Error(error?.message || "Failed to create player");
    }

    //Return the player's ID, username and claim code
    return {
        id: data.id,
        username: data.username,
        claimCode: data.claim_code
    }
};

//Used for claiming a player that has been created
export async function claimPlayer(
    userId: string,
    claimCode: string
) {
    //Check to see if the user already owns a player
    const { data: existingPlayer } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", userId)
        .single();

    //If they do own a player throw an error
    if (existingPlayer) {
        throw new Error("User already owns a player");
    }

    //Find the unclaimed player
    const { data: player, error: findError } = await supabase
        .from("players")
        .select("*")
        .eq("claim_code", claimCode)
        .is("user_id", null)
        .single();

    //If the code could not be found or the user_id was not null
    if (findError || !player) {
        throw new Error("Invalid or already used code");
    }
    
    //Update the user_id with their ID and make claim_code null
    const { data: updatedPlayer, error: UpdateError} = await supabase
        .from("players")
        .update({
            user_id: userId,
            claim_code: null
        })
        .eq("id", player.id)
        .select()
        .single();
    
    //If there is an error updating show message
    if (UpdateError) {
        throw new Error(UpdateError.message);
    }

    //Return the player's ID and username
    return {
        id: updatedPlayer.id,
        username: updatedPlayer.username
    }
}