import { Router } from "express";

import { supabase } from "../libs/supabase.js";

import {
	AuthenticatedRequest,
	requireAuth,
} from "../middleware/requireAuth.js";

import { createPlayer } from "../services/players.services.js";

const router = Router();

//Player creation validation
router.post("/create", requireAuth, async (req: AuthenticatedRequest, res) => {
	try {
		const { player_name } = req.body;

		const trimmedName = player_name.trim();
		if (!trimmedName) {
			return res.status(400).json({ error: "Player name is required" });
		}

		const { data: duplicatePlayer, error: dupError } = await supabase
			.from("players")
			.select("id")
			.eq("account_id", req.user!.id)
			.maybeSingle();

		if (dupError) {
			return res
				.status(500)
				.json({ error: "Failed to check existing player" });
		}

		if (duplicatePlayer) {
			return res
				.status(400)
				.json({ error: "Account already has a player" });
		}

		const { data: existingPlayer, error: checkError } = await supabase
			.from("players")
			.select("id")
			.eq("player_name", trimmedName)
			.maybeSingle();

		if (checkError) {
			return res
				.status(500)
				.json({ error: "Failed to check player name" });
		}

		if (existingPlayer) {
			return res.status(400).json({
				error: "A player with this name already exists",
			});
		}

		const player = await createPlayer(player_name, req.user!.id);

		res.status(201).json({
			message: "Player created successfully",
			player,
		});
	} catch (err: any) {
		res.status(400).json({ error: err.message });
	}
});

export default router;
