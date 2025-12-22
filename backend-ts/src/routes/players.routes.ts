import { Router } from "express";

import { supabase } from "../libs/supabase.js";

//Authentication required for performing actions
import {
	AuthenticatedRequest,
	requireAuth,
} from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

//Services required for routes
import { createPlayer, claimPlayer } from "../services/players.services.js";

const router = Router();

//Route for creating a new player
router.post("/create", requireAdmin, async (req: AuthenticatedRequest, res) => {
	try {
		//Gets username from the request
		const { player_name } = req.body;

		//If there is no username an error is thrown
		if (!player_name) {
			return res.status(400).json({ error: "Player name required" });
		}

		//createPlayer is called with the parameter username
		const player = await createPlayer(player_name, req.group_id!);

		//A success response is sent with the player's id, username and claim code
		res.status(201).json({
			message: "Player created successfully",
			player,
		});
	} catch (err: any) {
		res.status(400).json({ error: err.message });
	}
});

//Route for claiming a player
router.post("/claim", requireAuth, async (req: AuthenticatedRequest, res) => {
	try {
		//Gets claimCode from the request
		const { claim_code } = req.body;

		//If there is no claimCode an error is thrown
		if (!claim_code) {
			return res.status(400).json({ error: "Claim code required" });
		}

		//Check to see if the user already owns a player
		const { data: existingPlayer } = await supabase
			.from("players")
			.select("id")
			.eq("account_id", req.user!.id)
			.single();

		//If they do own a player throw an error
		if (existingPlayer) {
			return res
				.status(400)
				.json({ error: "User already owns a player " });
		}

		//claimPlayer is called with parameters user.id and claimCode
		const player = await claimPlayer(req.user!.id, claim_code);

		//A success response is sent with player's id and username
		res.json({
			message: "Player claimed successfully",
			player,
		});
	} catch (err: any) {
		res.status(400).json({ error: err.message });
	}
});

export default router;
