import { Router } from "express";
import {
	requireAuth,
	AuthenticatedRequest,
} from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

import {
	createTournament,
	signupPlayer,
	generateFirstRound,
} from "../services/tournaments.services.js";

const router = Router();

/**
 * CREATE TOURNAMENT (ADMIN ONLY)
 */
router.post("/create", requireAdmin, async (req: AuthenticatedRequest, res) => {
	try {
		const { tournament_name, start_date } = req.body;

		if (!tournament_name || !start_date) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		const tournament = await createTournament(
			tournament_name,
			req.user!.id,
			start_date
		);

		res.status(201).json(tournament);
	} catch (err: any) {
		res.status(400).json({ error: err.message });
	}
});

/**
 * SIGN UP PLAYER (ANY AUTHENTICATED USER)
 */
router.post("/signup", requireAuth, async (req: AuthenticatedRequest, res) => {
	try {
		const { tournament_id, player_id } = req.body;

		if (!tournament_id || !player_id) {
			return res
				.status(400)
				.json({ error: "Missing tournament or player" });
		}

		await signupPlayer(tournament_id, player_id);
		res.status(201).json({ success: true });
	} catch (err: any) {
		res.status(400).json({ error: err.message });
	}
});

/**
 * GENERATE FIRST ROUND / START TOURNAMENT (ADMIN ONLY)
 */
router.post(
	"/generate-brackets",
	requireAdmin,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { tournament_id } = req.body;

			if (!tournament_id) {
				return res.status(400).json({ error: "Missing tournament_id" });
			}

			await generateFirstRound(tournament_id);
			res.status(201).json({ success: true });
		} catch (err: any) {
			res.status(400).json({ error: err.message });
		}
	}
);

export default router;
