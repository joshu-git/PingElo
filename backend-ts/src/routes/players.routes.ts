import { Router } from "express";

import { supabase } from "../libs/supabase.js";

import {
	AuthenticatedRequest,
	requireAuth,
} from "../middleware/requireAuth.js";

import { createPlayer } from "../services/players.services.js";

const router = Router();

//Route for creating a new player
router.post("/create", requireAuth, async (req: AuthenticatedRequest, res) => {
	try {
		const { player_name } = req.body;

		if (!player_name)
			return res.status(400).json({ error: "Player name required" });

		const { data: duplicatePlayer } = await supabase
			.from("players")
			.select("account_id")
			.eq("account_id", req.user!.id);

		if (duplicatePlayer)
			return res
				.status(400)
				.json({ error: "Account already has a player" });

		const player = await createPlayer(player_name, req.group_id!);

		res.status(201).json({
			message: "Player created successfully",
			player,
		});
	} catch (err: any) {
		res.status(400).json({ error: err.message });
	}
});

export default router;
