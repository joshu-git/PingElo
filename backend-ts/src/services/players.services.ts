//For using supabase calls
import { supabase } from "../libs/supabase.js";

//Used for creating a player
export async function createPlayer(playerName: string, group_id: string) {
	//Create the new player in players
	const { data, error } = await supabase
		.from("players")
		.insert({
			player_name: playerName,
			group_id: group_id,
		})
		.select()
		.single();

	if (error || !data) {
		throw new Error(error?.message || "Failed to create player");
	}

	return {
		id: data.id,
		player_name: data.player_name,
	};
}
