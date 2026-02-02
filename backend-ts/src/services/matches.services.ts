import { supabase } from "../libs/supabase.js";
import {
	validateTournamentMatch,
	advanceBracketRound,
} from "./tournaments.services.js";

/* ============================================================
   ELO LOGIC (UNCHANGED)
   ============================================================ */

const BASE_K = 50;
const IDEAL_POINTS = 7;

function expectedScore(rA: number, rB: number) {
	return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function effectiveK(scoreA: number, scoreB: number, gamePoints: number) {
	const diff = Math.abs(scoreA - scoreB) / gamePoints;
	const length = gamePoints / IDEAL_POINTS;
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

	if (isTournament) {
		return {
			winner,
			eloChangeA: winner === "A" ? 15 : -15,
			eloChangeB: winner === "A" ? -15 : 15,
		};
	}

	const actualA = winner === "A" ? 1 : 0;
	const expectedA = expectedScore(rA, rB);
	const k = effectiveK(scoreA, scoreB, gamePoints);
	const deltaA = Math.round(k * (actualA - expectedA));

	return {
		winner,
		eloChangeA: deltaA,
		eloChangeB: -deltaA,
	};
}

/* ============================================================
   MATCH NUMBER
   ============================================================ */

async function getNextMatchNumber() {
	const { data } = await supabase
		.from("matches")
		.select("match_number")
		.order("match_number", { ascending: false })
		.limit(1)
		.single();

	return (data?.match_number ?? 0) + 1;
}

/* ============================================================
   CREATE SINGLES MATCH
   ============================================================ */

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

	if (tournamentId) {
		bracketId = await validateTournamentMatch(
			tournamentId,
			[playerAId],
			[playerBId]
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

	const { data: match } = await supabase
		.from("matches")
		.insert({
			player_a1_id: playerAId,
			player_b1_id: playerBId,
			score_a: scoreA,
			score_b: scoreB,
			game_points: gamePoints,
			created_by: userId,
			winner1: winnerId,
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

//doubles
export async function createDoublesMatch(
	userId: string,
	a1: any,
	a2: any,
	b1: any,
	b2: any,
	scoreA: number,
	scoreB: number,
	gamePoints: number,
	tournamentId?: string | null
) {
	const teamARating = (a1.doubles_elo + a2.doubles_elo) / 2;
	const teamBRating = (b1.doubles_elo + b2.doubles_elo) / 2;

	const elo = calculateElo(
		teamARating,
		teamBRating,
		scoreA,
		scoreB,
		gamePoints,
		Boolean(tournamentId)
	);

	const matchNumber = await getNextMatchNumber();
	const winners = elo.winner === "A" ? [a1.id, a2.id] : [b1.id, b2.id];

	const { data: match } = await supabase
		.from("matches")
		.insert({
			player_a1_id: a1.id,
			player_a2_id: a2.id,
			player_b1_id: b1.id,
			player_b2_id: b2.id,
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
			elo_before_a1: a1.doubles_elo,
			elo_before_a2: a2.doubles_elo,
			elo_before_b1: b1.doubles_elo,
			elo_before_b2: b2.doubles_elo,
		})
		.select()
		.single();

	for (const p of [a1, a2]) {
		await supabase
			.from("players")
			.update({ doubles_elo: p.doubles_elo + elo.eloChangeA })
			.eq("id", p.id);
	}

	for (const p of [b1, b2]) {
		await supabase
			.from("players")
			.update({ doubles_elo: p.doubles_elo + elo.eloChangeB })
			.eq("id", p.id);
	}

	return { match, eloData: elo };
}
