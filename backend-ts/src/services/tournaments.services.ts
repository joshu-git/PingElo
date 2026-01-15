import { supabase } from "../libs/supabase.js";
import { v4 as uuidv4 } from "uuid";

// ---------------------- TOURNAMENT CREATION ----------------------
export async function createTournament(
	tournament_name: string,
	created_by: string,
	start_date: string,
	end_date: string,
	match_type: "singles" | "doubles"
) {
	const { data, error } = await supabase
		.from("tournaments")
		.insert({
			tournament_name,
			created_by,
			start_date,
			end_date,
			match_type,
			started: false,
			completed: false,
		})
		.select()
		.single();

	if (error) throw new Error(error.message);

	return data;
}

// ---------------------- SIGNUP PLAYER ----------------------
export async function signupPlayer(tournamentId: string, playerId: string) {
	// Check if player already signed up
	const { data: exists } = await supabase
		.from("tournament_signups")
		.select("*")
		.eq("tournament_id", tournamentId)
		.eq("player_id", playerId)
		.single();

	if (exists) throw new Error("Player already signed up");

	const { data, error } = await supabase
		.from("tournament_signups")
		.insert({ tournament_id: tournamentId, player_id: playerId })
		.select()
		.single();

	if (error) throw new Error(error.message);

	return data;
}

// ---------------------- GENERATE BRACKETS ----------------------
export async function generateBrackets(tournamentId: string) {
	// Fetch all signed-up players
	const { data: signups } = await supabase
		.from("tournament_signups")
		.select("player_id")
		.eq("tournament_id", tournamentId);

	if (!signups || signups.length === 0)
		throw new Error("No players signed up");

	const playerIds = signups.map((s) => s.player_id);
	const shuffled = playerIds.sort(() => Math.random() - 0.5);

	let round = 1;
	let bracketNumber = 1;

	const brackets = [];

	// Pair players for the first round
	while (shuffled.length > 0) {
		const playerA = shuffled.shift();
		const playerB = shuffled.shift() || null; // bye if odd number

		const bracketId = uuidv4();
		brackets.push({
			id: bracketId,
			tournament_id: tournamentId,
			bracket_number: bracketNumber,
			round,
			player_a1_id: playerA,
			player_b1_id: playerB,
			completed: !!playerB === false, // bye automatically completes
		});

		bracketNumber++;
	}

	// Insert brackets
	for (const b of brackets) {
		await supabase.from("tournament_brackets").insert(b);
	}

	// Mark tournament as started
	await supabase
		.from("tournaments")
		.update({ started: true })
		.eq("id", tournamentId);

	return brackets;
}

// ---------------------- VALIDATE MATCH ----------------------
export async function validateTournamentMatch(
	tournamentId: string,
	playersA: string[],
	playersB: string[]
): Promise<string | null> {
	// Find the bracket this match belongs to
	const { data: brackets } = await supabase
		.from("tournament_brackets")
		.select("*")
		.eq("tournament_id", tournamentId)
		.eq("completed", false);

	if (!brackets || brackets.length === 0) return null;

	for (const bracket of brackets) {
		const aIds = [bracket.player_a1_id, bracket.player_a2_id].filter(
			Boolean
		);
		const bIds = [bracket.player_b1_id, bracket.player_b2_id].filter(
			Boolean
		);

		if (arraysEqual(playersA, aIds) && arraysEqual(playersB, bIds)) {
			return bracket.id;
		}

		if (arraysEqual(playersB, aIds) && arraysEqual(playersA, bIds)) {
			return bracket.id;
		}
	}

	return null;
}

// Helper to compare arrays
function arraysEqual(a: string[], b: string[]) {
	if (a.length !== b.length) return false;
	return a.every((v) => b.includes(v));
}

// ---------------------- ADVANCE BRACKET ----------------------
export async function advanceBracketRound(
	tournamentId: string,
	bracketId: string
) {
	// Mark this bracket as completed
	await supabase
		.from("tournament_brackets")
		.update({ completed: true })
		.eq("id", bracketId);

	// Check if current round is done
	const { data: remaining } = await supabase
		.from("tournament_brackets")
		.select("*")
		.eq("tournament_id", tournamentId)
		.eq("completed", false);

	if (!remaining || remaining.length > 0) return; // Round still ongoing

	// Generate next round brackets
	// Collect winners
	const { data: brackets } = await supabase
		.from("tournament_brackets")
		.select("*")
		.eq("tournament_id", tournamentId);

	const finishedBrackets = (brackets ?? []).filter((b) => b.completed);
	const winners: string[] = [];
	for (const b of finishedBrackets) {
		if (b.winner1) winners.push(b.winner1);
		if (b.winner2) winners.push(b.winner2);
	}

	if (winners.length <= 1) {
		// Tournament complete
		if (winners[0])
			await supabase
				.from("tournaments")
				.update({ completed: true, winner_player_id: winners[0] })
				.eq("id", tournamentId);
		return;
	}

	// Next round brackets
	const shuffled = winners.sort(() => Math.random() - 0.5);
	let round = (finishedBrackets[0]?.round || 1) + 1;
	let bracketNumber = 1;

	for (let i = 0; i < shuffled.length; i += 2) {
		const playerA = shuffled[i];
		const playerB = shuffled[i + 1] || null;

		const bracketId = uuidv4();
		await supabase.from("tournament_brackets").insert({
			id: bracketId,
			tournament_id: tournamentId,
			bracket_number: bracketNumber,
			round,
			player_a1_id: playerA,
			player_b1_id: playerB,
			completed: !!playerB === false,
		});

		bracketNumber++;
	}
}

// ---------------------- MARK COMPLETED ----------------------
export async function markTournamentCompleted(tournamentId: string) {
	const { data: brackets } = await supabase
		.from("tournament_brackets")
		.select("*")
		.eq("tournament_id", tournamentId)
		.eq("completed", false);

	if (!brackets || brackets.length === 0) {
		await supabase
			.from("tournaments")
			.update({ completed: true })
			.eq("id", tournamentId);
	}
}
