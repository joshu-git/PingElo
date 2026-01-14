import { supabase } from "../libs/supabase.js";

export async function insertGroup(group_name: string) {
	const { data, error } = await supabase
		.from("groups")
		.insert({ group_name })
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function addPlayerToGroup(playerId: string, groupId: string) {
	const { error } = await supabase
		.from("players")
		.update({ group_id: groupId })
		.eq("id", playerId);

	if (error) throw error;
}

export async function removePlayerFromGroup(playerId: string) {
	const { error } = await supabase
		.from("players")
		.update({ group_id: null })
		.eq("id", playerId);

	if (error) throw error;
}

export async function setAccountAdmin(id: string, is_admin: boolean) {
	const { error } = await supabase
		.from("account")
		.update({ is_admin })
		.eq("id", id);

	if (error) throw error;
}
