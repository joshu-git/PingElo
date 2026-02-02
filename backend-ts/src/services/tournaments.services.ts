import { supabase } from "../libs/supabase.js";
import { v4 as uuidv4 } from "uuid";

//Fisher yates shuffle algorithm
function shuffle<T>(array: readonly T[]): T[] {
	const arr = array.slice() as T[];

	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));

		const tmp = arr[i]!;
		arr[i] = arr[j]!;
		arr[j] = tmp;
	}

	return arr;
}

//Creates a tournament with its name
export async function createTournament(
	tournament_name: string,
	created_by: string,
	start_date: string
) {
	const { data, error } = await supabase
		.from("tournaments")
		.insert({
			tournament_name,
			created_by,
			start_date,
			started: false,
			completed: false,
		})
		.select()
		.single();

	if (error) throw error;
	return data;
}

//Signs up a player to the tournament
export async function signupPlayer(tournamentId: string, playerId: string) {
	const { data: tournament } = await supabase
		.from("tournaments")
		.select("started, completed")
		.eq("id", tournamentId)
		.single();

	if (!tournament) throw new Error("Tournament not found");
	if (tournament.started || tournament.completed) {
		throw new Error("Tournament already started");
	}

	const { error } = await supabase.from("tournament_signups").insert({
		tournament_id: tournamentId,
		player_id: playerId,
	});

	if (error) throw error;
}

//Generates the first round of the tournament
export async function generateFirstRound(tournamentId: string) {
	const { data: signups } = await supabase
		.from("tournament_signups")
		.select("player_id")
		.eq("tournament_id", tournamentId);

	if (!signups || signups.length < 5) {
		throw new Error("Not enough players");
	}

	const players = shuffle(signups.map((s) => s.player_id));

	const inserts = [];

	for (let i = 0; i < players.length; i += 2) {
		const a = players[i];
		const b = players[i + 1] ?? null;

		inserts.push({
			id: uuidv4(),
			tournament_id: tournamentId,
			round: 1,
			player_a_id: a,
			player_b_id: b,
			winner_id: b ? null : a,
			match_id: null,
			completed: !b,
		});
	}

	await supabase.from("tournament_brackets").insert(inserts);

	await supabase
		.from("tournaments")
		.update({ started: true })
		.eq("id", tournamentId);
}

//Validate a match is supposed to be in the tournament
export async function validateTournamentMatch(
	tournamentId: string,
	playerAId: string,
	playerBId: string
): Promise<string | null> {
	const { data: tournament } = await supabase
		.from("tournaments")
		.select("started, completed")
		.eq("id", tournamentId)
		.single();

	if (!tournament || !tournament.started || tournament.completed) {
		return null;
	}

	let { data: bracket } = await supabase
		.from("tournament_brackets")
		.select("id, match_id")
		.eq("tournament_id", tournamentId)
		.eq("completed", false)
		.eq("player_a_id", playerAId)
		.eq("player_b_id", playerBId)
		.maybeSingle();

	if (!bracket) {
		const res = await supabase
			.from("tournament_brackets")
			.select("id, match_id")
			.eq("tournament_id", tournamentId)
			.eq("completed", false)
			.eq("player_a_id", playerAId)
			.eq("player_b_id", playerBId)
			.maybeSingle();

		bracket = res.data;
	}

	if (!bracket || bracket.match_id) return null;

	return bracket.id;
}

//Advance to the next round of brackets
export async function advanceBracketRound(
	tournamentId: string,
	bracketId: string
) {
	const { data: bracket } = await supabase
		.from("tournament_brackets")
		.select("round")
		.eq("id", bracketId)
		.single();

	if (!bracket) return;

	const round = bracket.round;

	const { data: open } = await supabase
		.from("tournament_brackets")
		.select("id")
		.eq("tournament_id", tournamentId)
		.eq("round", round)
		.eq("completed", false);

	if (open && open.length > 0) return;

	const { data: finished } = await supabase
		.from("tournament_brackets")
		.select("winner_id")
		.eq("tournament_id", tournamentId)
		.eq("round", round);

	const winners = shuffle(
		finished
			?.map((b) => b.winner_id)
			.filter((id): id is string => id !== null) ?? []
	);

	if (winners.length === 1) {
		await supabase
			.from("tournaments")
			.update({
				completed: true,
				winner: winners[0],
				end_date: new Date().toISOString().slice(0, 10),
			})
			.eq("id", tournamentId);
		return;
	}

	const nextRound = round + 1;
	const inserts = [];

	for (let i = 0; i < winners.length; i += 2) {
		const a = winners[i];
		const b = winners[i + 1] ?? null;

		inserts.push({
			id: uuidv4(),
			tournament_id: tournamentId,
			round: nextRound,
			player_a_id: a,
			player_b_id: b,
			winner_id: b ? null : a,
			match_id: null,
			completed: !b,
		});
	}

	await supabase.from("tournament_brackets").insert(inserts);
}
