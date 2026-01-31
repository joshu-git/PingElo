import { supabase } from "../libs/supabase.js";
import { v4 as uuidv4 } from "uuid";

/* ============================================================
   CREATE TOURNAMENT
   ============================================================ */

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

/* ============================================================
   SIGN UP PLAYER
   ============================================================ */

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

/* ============================================================
   GENERATE FIRST ROUND (WITH BYES)
   ============================================================ */

export async function generateFirstRound(tournamentId: string) {
	const { data: signups } = await supabase
		.from("tournament_signups")
		.select("player_id")
		.eq("tournament_id", tournamentId);

	if (!signups || signups.length < 2) {
		throw new Error("Not enough players");
	}

	const players = signups
		.map((s) => s.player_id)
		.sort(() => Math.random() - 0.5);

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

/* ============================================================
   VALIDATE TOURNAMENT MATCH
   ============================================================ */

export async function validateTournamentMatch(
	tournamentId: string,
	playersA: string[],
	playersB: string[]
): Promise<string | null> {
	const a = playersA[0];
	const b = playersB[0];

	// 1️⃣ Tournament must be active
	const { data: tournament } = await supabase
		.from("tournaments")
		.select("started, completed")
		.eq("id", tournamentId)
		.single();

	if (!tournament || !tournament.started || tournament.completed) {
		return null;
	}

	// 2️⃣ Try A vs B
	let { data: bracket } = await supabase
		.from("tournament_brackets")
		.select("id, match_id")
		.eq("tournament_id", tournamentId)
		.eq("completed", false)
		.eq("player_a_id", a)
		.eq("player_b_id", b)
		.maybeSingle();

	// 3️⃣ If not found, try B vs A
	if (!bracket) {
		const res = await supabase
			.from("tournament_brackets")
			.select("id, match_id")
			.eq("tournament_id", tournamentId)
			.eq("completed", false)
			.eq("player_a_id", b)
			.eq("player_b_id", a)
			.maybeSingle();

		bracket = res.data;
	}

	// 4️⃣ Must exist and not already locked
	if (!bracket || bracket.match_id) return null;

	return bracket.id;
}

/* ============================================================
   LOCK BRACKET (ANTI DOUBLE-SUBMIT)
   ============================================================ */

export async function lockBracket(bracketId: string) {
	const { data } = await supabase
		.from("tournament_brackets")
		.update({ match_id: "LOCKED" })
		.eq("id", bracketId)
		.is("match_id", null)
		.select()
		.maybeSingle();

	if (!data) {
		throw new Error("Tournament match already submitted");
	}
}

/* ============================================================
   ADVANCE BRACKET ROUND
   ============================================================ */

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

	const winners = finished
		?.map((b) => b.winner_id)
		.filter(Boolean) as string[];

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
