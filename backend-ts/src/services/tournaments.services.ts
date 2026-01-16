import { supabase } from "../libs/supabase.js";
import { v4 as uuidv4 } from "uuid";

/* -------------------- CREATE TOURNAMENT -------------------- */
export async function createTournament(
	tournament_name: string,
	created_by: string,
	start_date: string,
	match_type: "singles" | "doubles"
) {
	const { data, error } = await supabase
		.from("tournaments")
		.insert({
			tournament_name,
			created_by,
			start_date,
			match_type,
			started: false,
			completed: false,
		})
		.select()
		.single();

	if (error) throw error;
	return data;
}

/* -------------------- SIGNUP -------------------- */
export async function signupPlayer(tournamentId: string, playerId: string) {
	const { data: exists } = await supabase
		.from("tournament_signups")
		.select("id")
		.eq("tournament_id", tournamentId)
		.eq("player_id", playerId)
		.maybeSingle();

	if (exists) throw new Error("Player already signed up");

	const { data, error } = await supabase
		.from("tournament_signups")
		.insert({ tournament_id: tournamentId, player_id: playerId })
		.select()
		.single();

	if (error) throw error;
	return data;
}

/* -------------------- GENERATE FIRST ROUND -------------------- */
export async function generateBrackets(tournamentId: string) {
	const { data: tournament } = await supabase
		.from("tournaments")
		.select("match_type")
		.eq("id", tournamentId)
		.single();

	if (!tournament) throw new Error("Tournament not found");

	const { data: signups } = await supabase
		.from("tournament_signups")
		.select("player_id")
		.eq("tournament_id", tournamentId);

	if (!signups || signups.length < 2) throw new Error("Not enough players");

	if (tournament.match_type === "doubles" && signups.length % 2 !== 0)
		throw new Error(
			"Doubles tournaments require an even number of players"
		);

	const players = signups
		.map((s) => s.player_id)
		.sort(() => Math.random() - 0.5);

	let bracketNumber = 1;
	const inserts: any[] = [];

	if (tournament.match_type === "singles") {
		for (let i = 0; i < players.length; i += 2) {
			inserts.push({
				id: uuidv4(),
				tournament_id: tournamentId,
				round: 1,
				bracket_number: bracketNumber++,
				player_a1_id: players[i],
				player_b1_id: players[i + 1] ?? null,
				completed: !players[i + 1],
			});
		}
	} else {
		for (let i = 0; i < players.length; i += 4) {
			inserts.push({
				id: uuidv4(),
				tournament_id: tournamentId,
				round: 1,
				bracket_number: bracketNumber++,
				player_a1_id: players[i],
				player_a2_id: players[i + 1],
				player_b1_id: players[i + 2],
				player_b2_id: players[i + 3],
				completed: false,
			});
		}
	}

	await supabase.from("tournament_brackets").insert(inserts);
	await supabase
		.from("tournaments")
		.update({ started: true })
		.eq("id", tournamentId);
}

/* -------------------- VALIDATE MATCH -------------------- */
export async function validateTournamentMatch(
	tournamentId: string,
	playersA: string[],
	playersB: string[]
): Promise<string | null> {
	const { data: brackets } = await supabase
		.from("tournament_brackets")
		.select("*")
		.eq("tournament_id", tournamentId)
		.eq("completed", false);

	if (!brackets) return null;

	for (const b of brackets) {
		const a = [b.player_a1_id, b.player_a2_id].filter(Boolean);
		const c = [b.player_b1_id, b.player_b2_id].filter(Boolean);

		if (same(a, playersA) && same(c, playersB)) return b.id;
		if (same(a, playersB) && same(c, playersA)) return b.id;
	}
	return null;
}

function same(a: string[], b: string[]) {
	return a.length === b.length && a.every((x) => b.includes(x));
}

/* -------------------- ADVANCE ROUND -------------------- */
export async function advanceBracketRound(
	tournamentId: string,
	bracketId: string
) {
	await supabase
		.from("tournament_brackets")
		.update({ completed: true })
		.eq("id", bracketId);

	const { data: open } = await supabase
		.from("tournament_brackets")
		.select("id")
		.eq("tournament_id", tournamentId)
		.eq("completed", false);

	if (open && open.length > 0) return;

	const { data: tournament } = await supabase
		.from("tournaments")
		.select("match_type")
		.eq("id", tournamentId)
		.single();

	if (!tournament) {
		throw new Error("Tournament not found");
	}

	const { data: finished } = await supabase
		.from("tournament_brackets")
		.select("*")
		.eq("tournament_id", tournamentId)
		.eq("completed", true);

	if (!finished) return;

	const winners: string[] = [];
	for (const b of finished) {
		if (b.winner1) winners.push(b.winner1);
		if (b.winner2) winners.push(b.winner2);
	}

	if (winners.length <= (tournament.match_type === "doubles" ? 2 : 1)) {
		await supabase
			.from("tournaments")
			.update({ completed: true })
			.eq("id", tournamentId);
		return;
	}

	const shuffled = winners.sort(() => Math.random() - 0.5);
	const nextRound = finished[0].round + 1;
	let bracketNumber = 1;

	const inserts: any[] = [];

	if (tournament.match_type === "singles") {
		for (let i = 0; i < shuffled.length; i += 2) {
			inserts.push({
				id: uuidv4(),
				tournament_id: tournamentId,
				round: nextRound,
				bracket_number: bracketNumber++,
				player_a1_id: shuffled[i],
				player_b1_id: shuffled[i + 1],
				completed: false,
			});
		}
	} else {
		for (let i = 0; i < shuffled.length; i += 4) {
			inserts.push({
				id: uuidv4(),
				tournament_id: tournamentId,
				round: nextRound,
				bracket_number: bracketNumber++,
				player_a1_id: shuffled[i],
				player_a2_id: shuffled[i + 1],
				player_b1_id: shuffled[i + 2],
				player_b2_id: shuffled[i + 3],
				completed: false,
			});
		}
	}

	await supabase.from("tournament_brackets").insert(inserts);
}
