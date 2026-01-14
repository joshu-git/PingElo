import { Router } from "express";
import { supabase } from "../libs/supabase.js";
import {
	AuthenticatedRequest,
	requireAuth,
} from "../middleware/requireAuth.js";
import {
	insertGroup,
	addPlayerToGroup,
	removePlayerFromGroup,
	setAccountAdmin,
} from "../services/groups.services.js";

const router = Router();

/* ================= CREATE GROUP ================= */
router.post("/create", requireAuth, async (req: AuthenticatedRequest, res) => {
	try {
		const { group_name } = req.body;
		if (!group_name)
			return res.status(400).json({ error: "Group name required" });

		// User must not already own a player
		const { data: existingPlayer } = await supabase
			.from("players")
			.select("id")
			.eq("account_id", req.user!.id)
			.maybeSingle();

		if (existingPlayer)
			return res
				.status(400)
				.json({ error: "Account already owns a player" });

		const group = await insertGroup(group_name);

		// Creator becomes admin (player can be created later)
		await setAccountAdmin(req.user!.id, true);

		res.status(201).json({ group });
	} catch (err: any) {
		res.status(400).json({ error: err.message });
	}
});

/* ================= JOIN GROUP ================= */
router.post("/join", requireAuth, async (req: AuthenticatedRequest, res) => {
	try {
		const { group_id, player_id } = req.body;
		if (!group_id || !player_id)
			return res
				.status(400)
				.json({ error: "group_id and player_id required" });

		// Player must exist and be unclaimed
		const { data: player } = await supabase
			.from("players")
			.select("group_id, account_id")
			.eq("id", player_id)
			.single();

		if (!player || player.account_id)
			return res
				.status(403)
				.json({ error: "Player already claimed or invalid" });

		if (player.group_id)
			return res.status(400).json({ error: "Player already in a group" });

		await addPlayerToGroup(player_id, group_id);

		res.json({ message: "Joined group" });
	} catch (err: any) {
		res.status(400).json({ error: err.message });
	}
});

/* ================= LEAVE GROUP ================= */
router.post("/leave", requireAuth, async (req: AuthenticatedRequest, res) => {
	try {
		const { player_id } = req.body;
		if (!player_id)
			return res.status(400).json({ error: "player_id required" });

		const { data: player } = await supabase
			.from("players")
			.select("group_id, account_id")
			.eq("id", player_id)
			.single();

		if (!player || !player.account_id)
			return res.status(403).json({
				error: "Unclaimed players cannot leave groups",
			});

		if (player.account_id !== req.user!.id)
			return res.status(403).json({ error: "Unauthorized" });

		const { data: account } = await supabase
			.from("account")
			.select("is_admin")
			.eq("id", req.user!.id)
			.single();

		if (account?.is_admin) {
			const { count } = await supabase
				.from("players")
				.select("id", { count: "exact" })
				.eq("group_id", player.group_id);

			if ((count ?? 0) > 1)
				return res.status(400).json({
					error: "Last admin cannot leave group",
				});

			await setAccountAdmin(req.user!.id, false);
		}

		await removePlayerFromGroup(player_id);
		res.json({ message: "Left group" });
	} catch (err: any) {
		res.status(400).json({ error: err.message });
	}
});

export default router;
