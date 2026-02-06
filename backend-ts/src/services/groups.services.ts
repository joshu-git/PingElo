import { supabase } from "../libs/supabase.js";

export async function createGroup(
	groupName: string,
	open: boolean,
	ownerId: string,
	playerId: string,
	groupDescription?: string
) {
	//Create group
	const { data: group, error: groupError } = await supabase
		.from("groups")
		.insert({
			group_name: groupName,
			group_description: groupDescription,
			open,
			group_owner_id: ownerId,
		})
		.select("id, group_name")
		.single();

	if (groupError) {
		throw new Error(groupError.message);
	}

	//Assign player to group
	const { error: updatePlayerError } = await supabase
		.from("players")
		.update({ group_id: group.id })
		.eq("id", playerId);

	if (updatePlayerError) {
		throw new Error(updatePlayerError.message);
	}

	const { error: updatePermsError } = await supabase
		.from("accounts")
		.update({ admin: true })
		.eq("id", ownerId);

	if (updatePermsError) {
		throw new Error(updatePermsError.message);
	}

	return {
		id: group.id,
		group_name: group.group_name,
	};
}
