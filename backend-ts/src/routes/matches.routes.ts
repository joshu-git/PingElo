import { Router } from "express";
import { supabase } from "../libs/supabase.js";

//Authentication required for performing actions
import {
	requireAuth,
	AuthenticatedRequest,
} from "../middleware/requireAuth.js";

//Services required for routes
import {
	createSinglesMatch,
	createDoublesMatch,
} from "../services/matches.services.js";

const router = Router();

//input validation
function validateMatchInput(body: any, match_type: string) {
	const { score_a, score_b } = body;

	//Ensure scores exist
	if (score_a == null || score_b == null) {
		const error = new Error("Missing scores");
		(error as any).status = 403;
		throw error;
	}

	//Ensure scores are not negative
	if (score_a < 0 || score_b < 0) {
		const error = new Error("Scores cannot be negative");
		(error as any).status = 403;
		throw error;
	}

	let playerIds: string[] = [];

	switch (match_type) {
		case "singles": {
			const { player_a1_id, player_b1_id } = body;
			if (!player_a1_id || !player_b1_id) {
				const error = new Error("Missing fields");
				(error as any).status = 403;
				throw error;
			}
			playerIds = [player_a1_id, player_b1_id];
			break;
		}
		case "doubles": {
			const { player_a1_id, player_a2_id, player_b1_id, player_b2_id } =
				body;
			if (
				!player_a1_id ||
				!player_a2_id ||
				!player_b1_id ||
				!player_b2_id
			) {
				const error = new Error("Missing fields");
				(error as any).status = 403;
				throw error;
			}
			playerIds = [
				player_a1_id,
				player_a2_id,
				player_b1_id,
				player_b2_id,
			];
			break;
		}
	}

	//Ensure all players are unique
	if (new Set(playerIds).size !== playerIds.length) {
		const error = new Error("Players must be unique");
		(error as any).status = 403;
		throw error;
	}

	//Ensure win by at least 2
	if (Math.abs(score_a - score_b) < 2) {
		const error = new Error("Match must be won by at least 2 points");
		(error as any).status = 403;
		throw error;
	}

	return {
		playerIds,
		score_a,
		score_b,
		game_points: Math.max(score_a, score_b),
		tournament_id: body.tournament_id ?? null,
	};
}

//ban enforcement
async function checkBans(players: any[]) {
	const playerIds = players.map((p) => p.id);
	const groupIds = players.map((p) => p.group_id).filter(Boolean);

	//Player bans
	const { data: playerBans } = await supabase
		.from("player_bans")
		.select("id")
		.in("player_id", playerIds)
		.eq("active", true);

	if (playerBans && playerBans.length > 0) {
		throw new Error("One or more players are banned");
	}

	//Group bans
	if (groupIds.length > 0) {
		const { data: groupBans } = await supabase
			.from("group_bans")
			.select("id")
			.in("group_id", groupIds)
			.eq("active", true);

		if (groupBans && groupBans.length > 0) {
			throw new Error("One or more groups are banned");
		}
	}
}

//ownership and admin checks
async function checkOwnership(players: any[], account_id: string) {
	return players.some((p) => p.account_id === account_id);
}

async function checkAdmin(players: any[], account_id: string) {
	const { data: admin } = await supabase
		.from("account")
		.select("is_admin")
		.eq("id", account_id)
		.single();

	if (!admin?.is_admin) {
		const error = new Error("Admin required");
		(error as any).status = 403;
		throw error;
	}

	const { data: userPlayer } = await supabase
		.from("players")
		.select("group_id")
		.eq("account_id", account_id)
		.single();

	if (!userPlayer?.group_id) {
		throw new Error("Admin must belong to a group");
	}

	const hasRights = players.some((p) => p.group_id === userPlayer.group_id);

	if (!hasRights) {
		throw new Error("Admin rights required");
	}
}

//singles
router.post(
	"/submit/singles",
	requireAuth,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { playerIds, score_a, score_b, game_points, tournament_id } =
				validateMatchInput(req.body, "singles");

			const [playerAId, playerBId] = playerIds;

			const { data: players } = await supabase
				.from("players")
				.select("id, account_id, singles_elo, group_id")
				.in("id", playerIds);

			if (!players || players.length !== 2) {
				return res.status(400).json({ error: "Invalid players" });
			}

			await checkBans(players);

			const isOwner = await checkOwnership(players, req.user!.id);
			if (!isOwner) await checkAdmin(players, req.user!.id);

			const playerA = players.find((p) => p.id === playerAId)!;
			const playerB = players.find((p) => p.id === playerBId)!;

			const result = await createSinglesMatch(
				req.user!.id,
				playerA.id,
				playerB.id,
				score_a,
				score_b,
				game_points,
				playerA.singles_elo,
				playerB.singles_elo,
				tournament_id
			);

			res.status(201).json(result);
		} catch (err: any) {
			res.status(err.status || 400).json({ error: err.message });
		}
	}
);

//doubles
router.post(
	"/submit/doubles",
	requireAuth,
	async (req: AuthenticatedRequest, res) => {
		try {
			const { playerIds, score_a, score_b, game_points, tournament_id } =
				validateMatchInput(req.body, "doubles");

			const { data: players } = await supabase
				.from("players")
				.select("id, account_id, doubles_elo, group_id")
				.in("id", playerIds);

			if (!players || players.length !== 4) {
				return res.status(400).json({ error: "Invalid players" });
			}

			await checkBans(players);

			const isOwner = await checkOwnership(players, req.user!.id);
			if (!isOwner) await checkAdmin(players, req.user!.id);

			const [a1, a2, b1, b2] = playerIds.map(
				(id) => players.find((p) => p.id === id)!
			);

			const result = await createDoublesMatch(
				req.user!.id,
				a1,
				a2,
				b1,
				b2,
				score_a,
				score_b,
				game_points,
				tournament_id
			);

			res.status(201).json(result);
		} catch (err: any) {
			res.status(err.status || 400).json({ error: err.message });
		}
	}
);

export default router;
