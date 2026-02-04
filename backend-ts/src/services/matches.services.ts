import { supabase } from "../libs/supabase.js";
import {
	validateTournamentMatch,
	advanceBracketRound,
} from "./tournaments.services.js";

//Elo logic
const BASE_K = 50;
const TOURNAMENT_BASE_K = 100;
const IDEAL_POINTS = 7;

function expectedScore(rA: number, rB: number) {
	return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function effectiveK(
	scoreA: number,
	scoreB: number,
	gamePoints: number,
	isTournament?: Boolean
) {
	const diff = Math.abs(scoreA - scoreB) / gamePoints;
	const length = gamePoints / IDEAL_POINTS;
	if (isTournament) {
		return TOURNAMENT_BASE_K * diff * length;
	}
	return BASE_K * diff * length;
}

function calculateElo(
	rA: number,
	rB: number,
	scoreA: number,
	scoreB: number,
	gamePoints: number,
	isTournament: boolean
) {
	const winner = scoreA > scoreB ? "A" : "B";

	const actualA = winner === "A" ? 1 : 0;
	const expectedA = expectedScore(rA, rB);
	const k = effectiveK(scoreA, scoreB, gamePoints, isTournament);
	const deltaA = Math.round(k * (actualA - expectedA));

	return {
		winner,
		eloChangeA: deltaA,
		eloChangeB: -deltaA,
	};
}

//Gets the next match number
async function getNextMatchNumber() {
	const { data } = await supabase
		.from("matches")
		.select("match_number")
		.order("match_number", { ascending: false })
		.limit(1)
		.single();

	return (data?.match_number ?? 0) + 1;
}

//Creates a singles match
export async function createSinglesMatch(
	userId: string,
	playerAId: string,
	playerBId: string,
	scoreA: number,
	scoreB: number,
	gamePoints: number,
	ratingA: number,
	ratingB: number,
	tournamentId?: string | null
) {
	let bracketId: string | null = null;

	//If there is a tournament id then check the match is allowed
	if (tournamentId) {
		bracketId = await validateTournamentMatch(
			tournamentId,
			playerAId,
			playerBId
		);
		if (!bracketId) {
			throw new Error("Match not allowed in this tournament");
		}
	}

	const elo = calculateElo(
		ratingA,
		ratingB,
		scoreA,
		scoreB,
		gamePoints,
		Boolean(tournamentId)
	);

	const matchNumber = await getNextMatchNumber();
	const winnerId = elo.winner === "A" ? playerAId : playerBId;

	const winners = elo.winner === "A" ? [playerAId] : [playerBId];

	const { data: match } = await supabase
		.from("matches")
		.insert({
			player_a1_id: playerAId,
			player_b1_id: playerBId,
			score_a: scoreA,
			score_b: scoreB,
			game_points: gamePoints,
			created_by: userId,
			winner1: winners[0],
			match_number: matchNumber,
			match_type: "singles",
			elo_change_a: elo.eloChangeA,
			elo_change_b: elo.eloChangeB,
			elo_before_a1: ratingA,
			elo_before_b1: ratingB,
			tournament_id: tournamentId ?? null,
			bracket_id: bracketId,
		})
		.select()
		.single();

	await supabase
		.from("players")
		.update({ singles_elo: ratingA + elo.eloChangeA })
		.eq("id", playerAId);

	await supabase
		.from("players")
		.update({ singles_elo: ratingB + elo.eloChangeB })
		.eq("id", playerBId);

	//Update the matches corresponding bracket
	if (tournamentId && bracketId) {
		await supabase
			.from("tournament_brackets")
			.update({
				match_id: match.id,
				winner_id: winnerId,
				completed: true,
			})
			.eq("id", bracketId);

		await advanceBracketRound(tournamentId, bracketId);
	}

	return { match, elo };
}

//Create a doubles match
export async function createDoublesMatch(
	userId: string,
	playerA1Id: string,
	playerA2Id: string,
	playerB1Id: string,
	playerB2Id: string,
	scoreA: number,
	scoreB: number,
	gamePoints: number,
	ratingA1: number,
	ratingA2: number,
	ratingB1: number,
	ratingB2: number
) {
	const teamARating = (ratingA1 + ratingA2) / 2;
	const teamBRating = (ratingB1 + ratingB2) / 2;

	const elo = calculateElo(
		teamARating,
		teamBRating,
		scoreA,
		scoreB,
		gamePoints,
		false
	);

	const matchNumber = await getNextMatchNumber();
	const winners =
		elo.winner === "A"
			? [playerA1Id, playerA2Id]
			: [playerB1Id, playerB2Id];

	const { data: match } = await supabase
		.from("matches")
		.insert({
			player_a1_id: playerA1Id,
			player_a2_id: playerA2Id,
			player_b1_id: playerB1Id,
			player_b2_id: playerB2Id,
			score_a: scoreA,
			score_b: scoreB,
			game_points: gamePoints,
			created_by: userId,
			winner1: winners[0],
			winner2: winners[1],
			match_number: matchNumber,
			match_type: "doubles",
			elo_change_a: elo.eloChangeA,
			elo_change_b: elo.eloChangeB,
			elo_before_a1: ratingA1,
			elo_before_a2: ratingA2,
			elo_before_b1: ratingB1,
			elo_before_b2: ratingB2,
		})
		.select()
		.single();

	await supabase
		.from("players")
		.update({ doubles_elo: ratingA1 + elo.eloChangeA })
		.eq("id", playerA1Id);

	await supabase
		.from("players")
		.update({ doubles_elo: ratingA2 + elo.eloChangeA })
		.eq("id", playerA2Id);

	await supabase
		.from("players")
		.update({ doubles_elo: ratingB1 + elo.eloChangeB })
		.eq("id", playerB1Id);
	await supabase

		.from("players")
		.update({ doubles_elo: ratingB2 + elo.eloChangeB })
		.eq("id", playerB2Id);

	return { match, elo };
}
