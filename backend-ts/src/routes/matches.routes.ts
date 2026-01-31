import { Router } from "express";
import { supabase } from "../libs/supabase.js";
import {
	requireAuth,
	AuthenticatedRequest,
} from "../middleware/requireAuth.js";
import {
	createSinglesMatch,
	createDoublesMatch,
} from "../services/matches.services.js";

const router = Router();

/* ------------------- INPUT VALIDATION ------------------- */
function validateMatchInput(body: any, matchType: "singles" | "doubles") {
	const { score_a, score_b } = body;

	// Ensure scores exist
	if (score_a == null || score_b == null) throw new Error("Missing scores");
	if (score_a < 0 || score_b < 0)
		throw new Error("Scores cannot be negative");
	if (Math.abs(score_a - score_b) < 2)
		throw new Error("Match must be won by at least 2 points");

	if (matchType === "singles") {
		const { player_a1_id, player_b1_id, tournament_id } = body;
		if (!player_a1_id || !player_b1_id)
			throw new Error("Missing player IDs");
		if (player_a1_id === player_b1_id)
			throw new Error("Players must be unique");

		return {
			playerIds: [player_a1_id, player_b1_id],
			scoreA: score_a,
			scoreB: score_b,
			gamePoints: Math.max(score_a, score_b),
			tournamentId: tournament_id ?? null,
		};
	} else {
		// doubles
		const {
			player_a1_id,
			player_a2_id,
			player_b1_id,
			player_b2_id,
			tournament_id,
		} = body;
		if (!player_a1_id || !player_a2_id || !player_b1_id || !player_b2_id)
			throw new Error("Missing player IDs");

		const allPlayers = [
			player_a1_id,
			player_a2_id,
			player_b1_id,
			player_b2_id,
		];
		if (new Set(allPlayers).size !== 4)
			throw new Error("Players must be unique");

		return {
			playerIds: allPlayers,
			scoreA: score_a,
			scoreB: score_b,
			gamePoints: Math.max(score_a, score_b),
			tournamentId: tournament_id ?? null,
		};
	}
}

/* ------------------- BAN CHECK ------------------- */
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

/* ------------------- ACCESS CHECK ------------------- */
async function checkAccess(players: any[], accountId: string) {
	const isOwner = players.some((p) => p.account_id === accountId);
	if (isOwner) return;

	const { data: admin } = await supabase
		.from("account")
		.select("is_admin")
		.eq("id", accountId)
		.single();
	if (!admin?.is_admin) throw new Error("Admin privileges required");

	const { data: userPlayer } = await supabase
		.from("players")
		.select("group_id")
		.eq("account_id", accountId)
		.single();

	const hasRights = players.some((p) => p.group_id === userPlayer?.group_id);
	if (!hasRights) throw new Error("Admin rights required for this match");
}

/* ------------------- SUBMIT SINGLES ------------------- */
router.post(
	"/submit/singles",
	requireAuth,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { playerIds, scoreA, scoreB, gamePoints, tournamentId } =
				validateMatchInput(req.body, "singles");

			// Fetch player details
			const { data: players } = await supabase
				.from("players")
				.select("id, account_id, singles_elo, group_id")
				.in("id", playerIds);
			if (!players || players.length !== 2)
				return res.status(400).json({ error: "Invalid players" });

			await checkBans(players);
			await checkAccess(players, req.user!.id);

			const playerA = players.find((p) => p.id === playerIds[0])!;
			const playerB = players.find((p) => p.id === playerIds[1])!;

			const result = await createSinglesMatch(
				req.user!.id,
				playerA.id,
				playerB.id,
				scoreA,
				scoreB,
				gamePoints,
				playerA.singles_elo,
				playerB.singles_elo,
				tournamentId
			);

			res.status(201).json(result);
		} catch (err: any) {
			res.status(400).json({ error: err.message });
		}
	}
);

/* ------------------- SUBMIT DOUBLES ------------------- */
router.post(
	"/submit/doubles",
	requireAuth,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { playerIds, scoreA, scoreB, gamePoints, tournamentId } =
				validateMatchInput(req.body, "doubles");

			const { data: players } = await supabase
				.from("players")
				.select("id, account_id, doubles_elo, group_id")
				.in("id", playerIds);
			if (!players || players.length !== 4)
				return res.status(400).json({ error: "Invalid players" });

			await checkBans(players);
			await checkAccess(players, req.user!.id);

			const [a1, a2, b1, b2] = playerIds.map(
				(id) => players.find((p) => p.id === id)!
			);

			const result = await createDoublesMatch(
				req.user!.id,
				a1,
				a2,
				b1,
				b2,
				scoreA,
				scoreB,
				gamePoints,
				tournamentId
			);

			res.status(201).json(result);
		} catch (err: any) {
			res.status(400).json({ error: err.message });
		}
	}
);

export default router;
