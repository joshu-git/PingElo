//For using supabase calls
import { supabase } from "../libs/supabase.js";

import { PlayersRow } from "../types/database.js";

//For generating claim codes
import { v4 as uuidv4 } from "uuid";

//Used for creating a claimable player
export async function createPlayer(playerName: string, group_id: string) {
	//Generate a unique claim code for the player
	const claim_code = uuidv4().slice(0, 8).toUpperCase();

	//Create the new player in players
	const { data, error } = await supabase
		.from("players")
		.insert({
			player_name: playerName,
			claim_code: claim_code,
			group_id: group_id,
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
		player_name: data.player_name,
		claim_code: data.claim_code,
	};
}

//Used for claiming a player that has been created
export async function claimPlayer(account_id: string, claim_code: string) {
	//Find the unclaimed player
	const { data: player, error: findError } = await supabase
		.from("players")
		.select("*")
		.eq("claim_code", claim_code)
		.is("user_id", null)
		.single();

	//If the code could not be found or the user_id was not null
	if (findError || !player) {
		throw new Error("Invalid or already used code");
	}

	//Update the user_id with their ID and make claim_code null
	const { data: updatedPlayer, error: updateError } = await supabase
		.from("players")
		.update({
			account_id: account_id,
			claim_code: null,
		})
		.eq("id", player.id)
		.select()
		.single();

	//If there is an error updating show message
	if (updateError) {
		throw new Error(updateError.message);
	}

	//Return the player's ID and username
	return {
		id: updatedPlayer.id,
		player_name: updatedPlayer.player_name,
	};
}
