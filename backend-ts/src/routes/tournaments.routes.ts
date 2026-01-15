import { Router } from "express";
import {
	requireAuth,
	AuthenticatedRequest,
} from "../middleware/requireAuth.js";
import {
	createTournament,
	signupPlayer,
	generateBrackets,
} from "../services/tournaments.services.js";

const router = Router();

// CREATE TOURNAMENT
router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
	try {
		const { tournament_name, start_date, end_date, match_type } = req.body;
		const tournament = await createTournament(
			tournament_name,
			req.user!.id,
			start_date,
			end_date,
			match_type
		);
		res.status(201).json(tournament);
	} catch (err: any) {
		res.status(400).json({ error: err.message });
	}
});

// SIGNUP PLAYER
router.post("/signup", requireAuth, async (req: AuthenticatedRequest, res) => {
	try {
		const { tournament_id, player_id } = req.body;
		const signup = await signupPlayer(tournament_id, player_id);
		res.status(201).json(signup);
	} catch (err: any) {
		res.status(400).json({ error: err.message });
	}
});

// GENERATE BRACKETS (FIRST ROUND)
router.post(
	"/generate-brackets",
	requireAuth,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { tournament_id } = req.body;
			const brackets = await generateBrackets(tournament_id);
			res.status(201).json(brackets);
		} catch (err: any) {
			res.status(400).json({ error: err.message });
		}
	}
);

export default router;
