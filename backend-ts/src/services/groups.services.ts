import { supabase } from "../libs/supabase.js";

//Create group
export async function createGroup(
	groupName: string,
	open: boolean,
	ownerId: string,
	playerId: string,
	groupDescription?: string
) {
	const { data: group, error: groupError } = await supabase
		.from("groups")
		.insert({
			group_name: groupName,
			group_description: groupDescription,
			open,
			group_owner_id: ownerId,
			created_by: ownerId,
		})
		.select("id, group_name")
		.single();

	if (groupError) throw new Error(groupError.message);

	const { error: updatePlayerError } = await supabase
		.from("players")
		.update({ group_id: group.id })
		.eq("id", playerId);

	if (updatePlayerError) throw new Error(updatePlayerError.message);

	const { error: updatePermsError } = await supabase
		.from("account")
		.update({ is_admin: true })
		.eq("id", ownerId);

	if (updatePermsError) throw new Error(updatePermsError.message);

	return {
		id: group.id,
		group_name: group.group_name,
	};
}

//Join group
export async function joinGroup(playerId: string, groupId: string) {
	const { error } = await supabase
		.from("players")
		.update({ group_id: groupId })
		.eq("id", playerId);

	if (error) throw new Error(error.message);
}

//Leave group
export async function leaveGroup(playerId: string, accountId: string) {
	const { error } = await supabase
		.from("players")
		.update({ group_id: null })
		.eq("id", playerId);

	if (error) throw new Error(error.message);

	const { error: permsError } = await supabase
		.from("account")
		.update({ is_admin: false })
		.eq("id", accountId);

	if (permsError) throw new Error(permsError.message);
}

//TODO: Delete group

//Give admin to a player
export async function giveAdmin(accountId: string) {
	const { error: permsError } = await supabase
		.from("account")
		.update({ is_admin: true })
		.eq("id", accountId);

	if (permsError) throw new Error(permsError.message);
}

//Remove admin from a player
export async function removeAdmin(accountId: string) {
	const { error: permsError } = await supabase
		.from("account")
		.update({ is_admin: false })
		.eq("id", accountId);

	if (permsError) throw new Error(permsError.message);
}

//Change the ownership of a group
export async function changeOwnership(groupName: string, newOwnerId: string) {
	const { error } = await supabase
		.from("groups")
		.update({ group_owner_id: newOwnerId })
		.eq("group_name", groupName);

	if (error) throw new Error(error.message);

	const { error: permsError } = await supabase
		.from("account")
		.update({ is_admin: false })
		.eq("id", newOwnerId);

	if (permsError) throw new Error(permsError.message);
}

//Kick player
export async function kickPlayer(playerId: string) {
	const { error } = await supabase
		.from("players")
		.update({ group_id: null })
		.eq("id", playerId);
}

//Ban player
export async function banPlayer(playerId: string) {
	const { error } = await supabase
		.from("players")
		.update({ group_id: null })
		.eq("id", playerId);

	//TODO: Add banning
}
