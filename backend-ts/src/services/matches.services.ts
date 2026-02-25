import { supabase } from "../libs/supabase.js";

import {
	validateTournamentMatch,
	advanceBracketRound,
} from "./tournaments.services.js";

import { applyMatchXp } from "./xp.service.js";

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
		.from("pe_matches")
		.select("match_number")
		.order("match_number", { ascending: false })
		.limit(1)
		.single();

	return (data?.match_number ?? 0) + 1;
}

//Updates player stats
async function updatePlayerStats(
	playerId: string,
	mode: "singles" | "doubles",
	isWinner: boolean
) {
	const { data, error } = await supabase
		.from("pe_player_stats")
		.select("*")
		.eq("player_id", playerId)
		.single();

	if (error && error.code !== "PGRST116") throw error;

	const current = data ?? {
		player_id: playerId,
		singles_matches: 0,
		singles_wins: 0,
		singles_losses: 0,
		doubles_matches: 0,
		doubles_wins: 0,
		doubles_losses: 0,
	};

	const updated =
		mode === "singles"
			? {
					...current,
					singles_matches: current.singles_matches + 1,
					singles_wins: current.singles_wins + (isWinner ? 1 : 0),
					singles_losses: current.singles_losses + (isWinner ? 0 : 1),
				}
			: {
					...current,
					doubles_matches: current.doubles_matches + 1,
					doubles_wins: current.doubles_wins + (isWinner ? 1 : 0),
					doubles_losses: current.doubles_losses + (isWinner ? 0 : 1),
				};

	await supabase.from("pe_player_stats").upsert({
		...updated,
		updated_at: new Date().toISOString(),
	});
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
	let groupId: string | null = null;

	if (!tournamentId) {
		const { data, error } = await supabase
			.from("pe_players")
			.select("group_id")
			.eq("id", playerAId)
			.single();

		if (error) {
			throw new Error("Failed to fetch group_id");
		}

		groupId = data.group_id;
	}

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

	const { data: match, error: matchError } = await supabase
		.from("pe_matches")
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
			tournament_id: tournamentId ?? null,
			bracket_id: bracketId,
			group_id: groupId,
		})
		.select()
		.single();

	if (matchError) {
		console.error("Match insert failed:", matchError);
		throw matchError;
	}

	if (!match) {
		throw new Error("Match insert returned null");
	}

	await supabase.from("pe_elo_history").insert([
		{
			player_id: playerAId,
			match_id: match.id,
			elo_change: elo.eloChangeA,
			mode: "singles",
			created_at: match.created_at,
		},
		{
			player_id: playerBId,
			match_id: match.id,
			elo_change: elo.eloChangeB,
			mode: "singles",
			created_at: match.created_at,
		},
	]);

	await supabase
		.from("pe_players")
		.update({ singles_elo: ratingA + elo.eloChangeA })
		.eq("id", playerAId);

	await supabase
		.from("pe_players")
		.update({ singles_elo: ratingB + elo.eloChangeB })
		.eq("id", playerBId);

	//Update stats for both players
	await updatePlayerStats(playerAId, "singles", winnerId === playerAId);
	await updatePlayerStats(playerBId, "singles", winnerId === playerBId);

	//Update XP and levels for both players
	await applyMatchXp({
		playerId: playerAId,
		isWinner: winnerId === playerAId,
		isTournament: Boolean(tournamentId),
	});

	await applyMatchXp({
		playerId: playerBId,
		isWinner: winnerId === playerBId,
		isTournament: Boolean(tournamentId),
	});

	//Update the matches corresponding bracket
	if (tournamentId && bracketId) {
		await supabase
			.from("pe_tournament_brackets")
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
	const { data, error } = await supabase
		.from("pe_players")
		.select("group_id")
		.eq("id", playerA1Id)
		.single();

	if (error) {
		throw new Error("Failed to fetch group_id");
	}

	const groupId = data.group_id;

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

	const { data: match, error: matchError } = await supabase
		.from("pe_matches")
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
			group_id: groupId,
		})
		.select()
		.single();

	if (matchError) {
		console.error("Match insert failed:", matchError);
		throw matchError;
	}

	if (!match) {
		throw new Error("Match insert returned null");
	}

	await supabase.from("pe_elo_history").insert([
		{
			player_id: playerA1Id,
			match_id: match.id,
			elo_change: elo.eloChangeA,
			mode: "doubles",
			created_at: match.created_at,
		},
		{
			player_id: playerA2Id,
			match_id: match.id,
			elo_change: elo.eloChangeA,
			mode: "doubles",
			created_at: match.created_at,
		},
		{
			player_id: playerB1Id,
			match_id: match.id,
			elo_change: elo.eloChangeB,
			mode: "doubles",
			created_at: match.created_at,
		},
		{
			player_id: playerB2Id,
			match_id: match.id,
			elo_change: elo.eloChangeB,
			mode: "doubles",
			created_at: match.created_at,
		},
	]);

	await supabase
		.from("pe_players")
		.update({ doubles_elo: ratingA1 + elo.eloChangeA })
		.eq("id", playerA1Id);

	await supabase
		.from("pe_players")
		.update({ doubles_elo: ratingA2 + elo.eloChangeA })
		.eq("id", playerA2Id);

	await supabase
		.from("pe_players")
		.update({ doubles_elo: ratingB1 + elo.eloChangeB })
		.eq("id", playerB1Id);
	await supabase

		.from("pe_players")
		.update({ doubles_elo: ratingB2 + elo.eloChangeB })
		.eq("id", playerB2Id);

	const teamAWon = elo.winner === "A";

	await updatePlayerStats(playerA1Id, "doubles", teamAWon);
	await updatePlayerStats(playerA2Id, "doubles", teamAWon);
	await updatePlayerStats(playerB1Id, "doubles", !teamAWon);
	await updatePlayerStats(playerB2Id, "doubles", !teamAWon);

	await applyMatchXp({
		playerId: playerA1Id,
		isWinner: teamAWon,
		isTournament: false,
	});
	await applyMatchXp({
		playerId: playerA2Id,
		isWinner: teamAWon,
		isTournament: false,
	});
	await applyMatchXp({
		playerId: playerB1Id,
		isWinner: !teamAWon,
		isTournament: false,
	});
	await applyMatchXp({
		playerId: playerB2Id,
		isWinner: !teamAWon,
		isTournament: false,
	});

	return { match, elo };
}

const PAGE_SIZE = 1000;

type EloState = { singles: number; doubles: number };

function assertExists<T>(value: T | null | undefined, message: string): T {
	if (value === null || value === undefined) throw new Error(message);
	return value;
}

export async function rebuildAllElos(): Promise<void> {
	console.log("Starting Elo rebuild");

	//Load players
	const eloMap: Record<string, EloState> = {};
	let playerOffset = 0;

	while (true) {
		const { data, error } = await supabase
			.from("pe_players")
			.select("id")
			.order("created_at", { ascending: true })
			.range(playerOffset, playerOffset + PAGE_SIZE - 1);

		if (error) throw error;
		if (!data || data.length === 0) break;

		for (const row of data) {
			const id = assertExists(row.id, "Player id missing");
			eloMap[id] = { singles: 1000, doubles: 1000 };
		}

		playerOffset += PAGE_SIZE;
	}

	console.log(`Loaded ${Object.keys(eloMap).length} players`);

	//Replay matches
	let matchOffset = 0;

	while (true) {
		const { data, error } = await supabase
			.from("pe_matches")
			.select("*")
			.order("match_number", { ascending: true })
			.range(matchOffset, matchOffset + PAGE_SIZE - 1);

		if (error) throw error;
		if (!data || data.length === 0) break;

		console.log(
			`Replaying matches ${matchOffset + 1} → ${
				matchOffset + data.length
			}`
		);

		for (const match of data) {
			const matchId = assertExists(match.id, "Match id missing");
			if (match.match_type === "singles") {
				await replaySingles(match, eloMap);
			} else if (match.match_type === "doubles") {
				await replayDoubles(match, eloMap);
			} else {
				throw new Error(`Unknown match type on match ${matchId}`);
			}
		}

		matchOffset += PAGE_SIZE;
	}

	//Persist final Elo to players
	const playerIds = Object.keys(eloMap);
	let writeOffset = 0;

	while (writeOffset < playerIds.length) {
		const batch = playerIds.slice(writeOffset, writeOffset + PAGE_SIZE);

		for (const playerId of batch) {
			const elo = assertExists(
				eloMap[playerId],
				`Missing Elo for ${playerId}`
			);
			await supabase
				.from("pe_players")
				.update({
					singles_elo: elo.singles,
					doubles_elo: elo.doubles,
				})
				.eq("id", playerId);
		}

		writeOffset += PAGE_SIZE;
	}

	console.log("Elo rebuild complete");
}

async function replaySingles(match: any, eloMap: Record<string, EloState>) {
	const playerA = assertExists(match.player_a1_id, "player_a1_id missing");
	const playerB = assertExists(match.player_b1_id, "player_b1_id missing");

	const stateA = assertExists(
		eloMap[playerA],
		`Missing Elo for player ${playerA}`
	);
	const stateB = assertExists(
		eloMap[playerB],
		`Missing Elo for player ${playerB}`
	);

	const scoreA = assertExists(match.score_a, "score_a missing");
	const scoreB = assertExists(match.score_b, "score_b missing");
	const gamePoints = assertExists(match.game_points, "game_points missing");

	const beforeA = stateA.singles;
	const beforeB = stateB.singles;

	const elo = calculateElo(
		beforeA,
		beforeB,
		scoreA,
		scoreB,
		gamePoints,
		Boolean(match.tournament_id)
	);

	stateA.singles += elo.eloChangeA;
	stateB.singles += elo.eloChangeB;

	await supabase.from("pe_elo_history").insert({
		player_id: playerA,
		match_id: match.id,
		elo_change: elo.eloChangeA,
		mode: "singles",
		created_at: match.created_at,
	});
	await supabase.from("pe_elo_history").insert({
		player_id: playerB,
		match_id: match.id,
		elo_change: elo.eloChangeB,
		mode: "singles",
		created_at: match.created_at,
	});
}

async function replayDoubles(match: any, eloMap: Record<string, EloState>) {
	const ids = [
		match.player_a1_id,
		match.player_a2_id,
		match.player_b1_id,
		match.player_b2_id,
	].map((pid, i) =>
		assertExists(pid, `Missing doubles player id at index ${i}`)
	);

	const [a1Id, a2Id, b1Id, b2Id] = ids;

	const a1 = assertExists(eloMap[a1Id], `Missing Elo for ${a1Id}`);
	const a2 = assertExists(eloMap[a2Id], `Missing Elo for ${a2Id}`);
	const b1 = assertExists(eloMap[b1Id], `Missing Elo for ${b1Id}`);
	const b2 = assertExists(eloMap[b2Id], `Missing Elo for ${b2Id}`);

	const scoreA = assertExists(match.score_a, "score_a missing");
	const scoreB = assertExists(match.score_b, "score_b missing");
	const gamePoints = assertExists(match.game_points, "game_points missing");

	const beforeA1 = a1.doubles;
	const beforeA2 = a2.doubles;
	const beforeB1 = b1.doubles;
	const beforeB2 = b2.doubles;

	const teamA = (beforeA1 + beforeA2) / 2;
	const teamB = (beforeB1 + beforeB2) / 2;

	const elo = calculateElo(teamA, teamB, scoreA, scoreB, gamePoints, false);

	const splitA = Math.round(elo.eloChangeA / 2);
	const splitB = Math.round(elo.eloChangeB / 2);

	a1.doubles += splitA;
	a2.doubles += splitA;
	b1.doubles += splitB;
	b2.doubles += splitB;

	await supabase.from("pe_elo_history").insert([
		{
			player_id: a1Id,
			match_id: match.id,
			elo_change: splitA,
			mode: "doubles",
			created_at: match.created_at,
		},
		{
			player_id: a2Id,
			match_id: match.id,
			elo_change: splitA,
			mode: "doubles",
			created_at: match.created_at,
		},
		{
			player_id: b1Id,
			match_id: match.id,
			elo_change: splitB,
			mode: "doubles",
			created_at: match.created_at,
		},
		{
			player_id: b2Id,
			match_id: match.id,
			elo_change: splitB,
			mode: "doubles",
			created_at: match.created_at,
		},
	]);
}
