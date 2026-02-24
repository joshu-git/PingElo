import { supabase } from "../libs/supabase.js";

//Player creation
export async function createPlayer(player_name: string, account_id: string) {
	const { data, error } = await supabase
		.from("pe_players")
		.insert({
			player_name,
			account_id,
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
