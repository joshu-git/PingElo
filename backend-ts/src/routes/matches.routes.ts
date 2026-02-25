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

//Input validation
function validateMatchInput(body: any, matchType: "singles" | "doubles") {
	const { score_a, score_b } = body;

	//Ensure scores are valid
	if (score_a == null || score_b == null) throw new Error("Missing scores");
	if (score_a < 0 || score_b < 0)
		throw new Error("Scores cannot be negative");
	if (score_a > 21 || score_b > 21)
		throw new Error("Scores cannot be over 21");
	if (Math.abs(score_a - score_b) < 2)
		throw new Error("Match must be won by at least 2 points");

	//Ensures player ids are valid
	if (matchType === "singles") {
		const { player_a1_id, player_b1_id, tournament_id } = body;
		if (!player_a1_id || !player_b1_id)
			throw new Error("Missing player IDs");

		const allPlayers = [player_a1_id, player_b1_id];
		if (new Set(allPlayers).size !== 2)
			throw new Error("Players must be unique");

		return {
			playerIds: [player_a1_id, player_b1_id],
			scoreA: score_a,
			scoreB: score_b,
			gamePoints: Math.max(score_a, score_b),
			tournamentId: tournament_id ?? null,
		};
	} else {
		const { player_a1_id, player_a2_id, player_b1_id, player_b2_id } = body;
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
			playerIds: [player_a1_id, player_a2_id, player_b1_id, player_b2_id],
			scoreA: score_a,
			scoreB: score_b,
			gamePoints: Math.max(score_a, score_b),
		};
	}
}

//Check the user has access to this match
async function checkAccess(
	players: any[],
	accountId: string,
	tournamentId?: string
) {
	const isOwner = players.some((p) => p.account_id === accountId);
	if (isOwner) return;

	const { data: account } = await supabase
		.from("account")
		.select("is_manager")
		.eq("id", accountId)
		.single();

	if (account?.is_manager && !tournamentId) return;

	if (!tournamentId) {
		const { data: admin } = await supabase
			.from("account")
			.select("is_admin")
			.eq("id", accountId)
			.single();
		if (!admin?.is_admin) throw new Error("Admin privileges required");

		const { data: userPlayer } = await supabase
			.from("pe_players")
			.select("group_id")
			.eq("account_id", accountId)
			.single();

		const hasRights = players.some(
			(p) => p.group_id === userPlayer?.group_id
		);
		if (!hasRights) throw new Error("Admin rights required for this match");
	} else {
		const { data: tournament } = await supabase
			.from("pe_tournaments")
			.select("created_by")
			.eq("id", tournamentId)
			.single();

		if (!tournament || tournament.created_by !== accountId) {
			throw new Error("Tournament owner required for this match");
		}
	}
}

//Ensures all players are in the same group
function enforceSameGroup(players: any[]) {
	const groupIds = players.map((p) => p.group_id);

	if (groupIds.some((g) => g == null))
		throw new Error("All players must belong to a group");

	if (new Set(groupIds).size !== 1) {
		throw new Error("All players must be in the same group");
	}
}

//Submit Singles
router.post(
	"/submit/singles",
	requireAuth,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { playerIds, scoreA, scoreB, gamePoints, tournamentId } =
				validateMatchInput(req.body, "singles");

			const { data: players } = await supabase
				.from("pe_players")
				.select("id, account_id, singles_elo, group_id")
				.in("id", playerIds);
			if (!players || players.length !== 2)
				return res.status(400).json({ error: "Invalid players" });

			await checkAccess(players, req.user!.id, tournamentId);

			if (!tournamentId) {
				enforceSameGroup(players);
			}

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

//Submit doubles
router.post(
	"/submit/doubles",
	requireAuth,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { playerIds, scoreA, scoreB, gamePoints } =
				validateMatchInput(req.body, "doubles");

			const { data: players } = await supabase
				.from("pe_players")
				.select("id, account_id, doubles_elo, group_id")
				.in("id", playerIds);
			if (!players || players.length !== 4)
				return res.status(400).json({ error: "Invalid players" });

			await checkAccess(players, req.user!.id);

			enforceSameGroup(players);

			const playerA1 = players.find((p) => p.id === playerIds[0])!;
			const playerA2 = players.find((p) => p.id === playerIds[1])!;
			const playerB1 = players.find((p) => p.id === playerIds[2])!;
			const playerB2 = players.find((p) => p.id === playerIds[3])!;

			const result = await createDoublesMatch(
				req.user!.id,
				playerA1.id,
				playerA2.id,
				playerB1.id,
				playerB2.id,
				scoreA,
				scoreB,
				gamePoints,
				playerA1.doubles_elo,
				playerA2.doubles_elo,
				playerB1.doubles_elo,
				playerB2.doubles_elo
			);

			res.status(201).json(result);
		} catch (err: any) {
			res.status(400).json({ error: err.message });
		}
	}
);

export default router;
