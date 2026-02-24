import { supabase } from "../libs/supabase.js";

//Player creation
export async function createPlayer(player_name: string, account_id: string) {
	//Create player
	const { data: player, error: playerError } = await supabase
		.from("pe_players")
		.insert({
			player_name,
			account_id,
		})
		.select()
		.single();

	if (playerError || !player) {
		throw new Error(playerError?.message || "Failed to create player");
	}

	//Create player stats
	const { error: statsError } = await supabase
		.from("pe_player_stats")
		.insert({
			player_id: player.id,
		});

	if (statsError) {
		throw new Error(statsError.message || "Failed to create player stats");
	}

	return {
		id: player.id,
		player_name: player.player_name,
	};
}
