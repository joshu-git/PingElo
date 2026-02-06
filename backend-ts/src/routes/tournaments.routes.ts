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

import { supabase } from "../libs/supabase.js";

const router = Router();

//Create tournament
router.post("/create", requireAdmin, async (req: AuthenticatedRequest, res) => {
	try {
		const { tournament_name, tournament_description, start_date } =
			req.body;

		if (!tournament_name || !start_date) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		const trimmedName = tournament_name.trim();
		if (!trimmedName) {
			return res
				.status(400)
				.json({ error: "Tournament name is required" });
		}

		const { data: existingTournament, error: checkError } = await supabase
			.from("tournaments")
			.select("id")
			.eq("tournament_name", trimmedName)
			.maybeSingle();

		if (checkError) {
			return res
				.status(500)
				.json({ error: "Failed to check tournament name" });
		}

		if (existingTournament) {
			return res.status(400).json({
				error: "A tournament with this name already exists",
			});
		}

		const tournament = await createTournament(
			trimmedName,
			req.user!.id,
			start_date,
			tournament_description
		);

		res.status(201).json(tournament);
	} catch (err: any) {
		res.status(400).json({ error: err.message });
	}
});

//Ban check
async function checkBans(players: any[]) {
	const playerIds = players.map((p) => p.id);
	const groupIds = players.map((p) => p.group_id).filter(Boolean);

	const { data: playerBans } = await supabase
		.from("player_bans")
		.select("id")
		.in("player_id", playerIds)
		.eq("active", true);
	if (playerBans?.length) throw new Error("One or more players are banned");

	if (groupIds.length > 0) {
		const { data: groupBans } = await supabase
			.from("group_bans")
			.select("id")
			.in("group_id", groupIds)
			.eq("active", true);
		if (groupBans?.length) throw new Error("One or more groups are banned");
	}
}

//Sign up to the tournament
router.post("/signup", requireAuth, async (req: AuthenticatedRequest, res) => {
	try {
		const { tournament_id, player_id } = req.body;

		if (!tournament_id || !player_id) {
			return res
				.status(400)
				.json({ error: "Missing tournament or player" });
		}

		const { data: tournament } = await supabase
			.from("tournaments")
			.select("started, completed")
			.eq("id", tournament_id)
			.single();

		if (!tournament)
			return res.status(400).json({ error: "Tournament not found" });

		if (tournament.started || tournament.completed)
			return res
				.status(400)
				.json({ error: "Tournament already started" });

		const { data: players } = await supabase
			.from("players")
			.select("id, account_id, group_id")
			.in("id", player_id);

		if (!players) return res.status(400).json({ error: "Invalid players" });

		await checkBans(players);

		await signupPlayer(tournament_id, player_id);
		res.status(201).json({ success: true });
	} catch (err: any) {
		res.status(400).json({ error: err.message });
	}
});

//Generate first round of tournament
router.post(
	"/generate-brackets",
	requireAdmin,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { tournament_id } = req.body;

			if (!tournament_id) {
				return res.status(400).json({ error: "Missing tournament_id" });
			}

			const { data: signups } = await supabase
				.from("tournament_signups")
				.select("player_id")
				.eq("tournament_id", tournament_id);

			if (!signups) throw new Error("No signups found");
			if (signups.length < 5) throw new Error("Not enough players");

			const players = signups.map((s) => s.player_id);

			await generateFirstRound(tournament_id, players);
			res.status(201).json({ success: true });
		} catch (err: any) {
			res.status(400).json({ error: err.message });
		}
	}
);

export default router;
