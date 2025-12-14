import { supabase } from "../libs/supabase.js";
import { calculateElo } from "./elo.services.js";
import type { MatchRow } from "../types/matches.js";

//Dry run the bootstrap to test if it is needed
export async function dryRunBootstrapEloSystem() {
  //Runs rpc for getting ordered matches
  const { data: matches, error } = await supabase
    .rpc("get_matches_ordered", { from_match: 1 });

  //Checks matches
  if (error || !matches) {
    throw new Error("Failed to fetch matches");
  }

  //Will store ratings of all players
  const ratings = new Map<string, number>();

  //
  const mismatches: {
    matchNumber: number;
    playerId: string;
    expected: number;
    actual: number | null;
  }[] = [];

  //Iterates through all of the matches
  for (const match of matches as MatchRow[]) {
    const a = match.player_a_id;
    const b = match.player_b_id;

    //If a or b hasn't got a rating set it to 1000
    if (!ratings.has(a)) ratings.set(a, 1000);
    if (!ratings.has(b)) ratings.set(b, 1000);

    //Gets their mapped ratings
    const ratingA = ratings.get(a)!;
    const ratingB = ratings.get(b)!;

    //Calculates the elo
    const result = calculateElo({
      ratingA,
      ratingB,
      scoreA: match.score_a,
      scoreB: match.score_b,
      gamePoints: match.game_points,
    });

    //If there is a mismatch return it
    if (
      match.elo_change_a !== null &&
      match.elo_change_a !== result.eloChangeA
    ) {
      mismatches.push({
        matchNumber: match.match_number!,
        playerId: a,
        expected: result.eloChangeA,
        actual: match.elo_change_a,
      });
    }

    //Set the mapped ratings to the new ratings
    ratings.set(a, result.newRatingA);
    ratings.set(b, result.newRatingB);
  }

  return {
    matchesChecked: matches.length,
    mismatches,
  };
}

//One off bootstrap for when things go wrong
export async function bootstrapEloSystem() {
  //Runs rpc for getting ordered matches
  const { data: matches, error } = await supabase
    .rpc("get_matches_ordered", { from_match: 1 });

  //Checks matches
  if (error || !matches) {
    throw new Error("Failed to fetch matches");
  }

  //Will store ratings of all players
  const ratings = new Map<string, number>();

  //Iterates through all the matches
  for (const match of matches as MatchRow[]) {
    const a = match.player_a_id;
    const b = match.player_b_id;

    //If a or b hasn't got a rating set it to 1000
    if (!ratings.has(a)) ratings.set(a, 1000);
    if (!ratings.has(b)) ratings.set(b, 1000);

    //Gets their mapped ratings
    const ratingA = ratings.get(a)!;
    const ratingB = ratings.get(b)!;

    //Calculates the elo
    const result = calculateElo({
      ratingA,
      ratingB,
      scoreA: match.score_a,
      scoreB: match.score_b,
      gamePoints: match.game_points,
    });

    //Updates the database with proper values
    await supabase.from("matches").update({
      elo_before_a: ratingA,
      elo_before_b: ratingB,
      elo_change_a: result.eloChangeA,
      elo_change_b: result.eloChangeB,
      winner: result.winner === "A" ? a : b,
    }).eq("id", match.id);

    //Set the mapped ratings to the new ratings
    ratings.set(a, result.newRatingA);
    ratings.set(b, result.newRatingB);
  }

  //Updates all player ratings
  for (const [playerId, elo] of ratings.entries()) {
    await supabase.from("players").update({ elo }).eq("id", playerId);
  }
}

//Delete a match for when there is an error
export async function deleteMatch(matchId: string) {
  //Fetches the match and checks it exists
  const { data: match } = await supabase
    .from("matches")
    .select("id, match_number")
    .eq("id", matchId)
    .single();

  if (!match || match.match_number == null) {
    throw new Error("Match not found");
  }

  const deletedNumber = match.match_number;

  //Deletes the match
  await supabase.from("matches").delete().eq("id", matchId);

  //Sets match numbers correctly
  await supabase.rpc("collapse_match_numbers_after", {
    deleted_number: deletedNumber,
  });

  //Recalculates the matches after the deleted one
  await recalculateFromMatch(deletedNumber);
}

//Move a match for misplaced matches
export async function moveMatch(matchId: string, newMatchNumber: number) {
  //Fetches the match and checks it exists
  const { data: match } = await supabase
      .from("matches")
      .select("id, match_number")
      .eq("id", matchId)
      .single();

  if (!match || match.match_number == null) {
    throw new Error("Match not found");
  }

  const oldMatchNumber = match.match_number;

  //Returns if the match is not being moved
  if (newMatchNumber === oldMatchNumber) return;

  //Checks if the match is moving up or down
  if (newMatchNumber < oldMatchNumber) {
    //Shifts the match numbers up
    await supabase.rpc("shift_matches_up", {
      from_number: newMatchNumber,
      to_number: oldMatchNumber,
    });
  } else {
    //Shifts the match numbers down
    await supabase.rpc("shift_matches_down", {
      from_number: oldMatchNumber,
      to_number: newMatchNumber,
    });
  }

  //Updates the matches number
  await supabase
    .from("matches")
    .update({ match_number: newMatchNumber })
    .eq("id", matchId);

  //Recalculates the matches from the smallest of match numbers
  await recalculateFromMatch(Math.min(oldMatchNumber, newMatchNumber));
}

//Recalculates the matches from n
export async function recalculateFromMatch(fromMatch: number) {
  //Rebuild ratings up to the match
  const ratings = new Map<string, number>();

  //Fetches all the matches
  const { data: allMatches } = await supabase
    .rpc("get_matches_ordered", { from_match: 1 });

  //If it fails or there are no matches return
  if (!allMatches) return;

  //Iterates through all matches before the match
  for (const match of allMatches as MatchRow[]) {
    if (match.match_number! >= fromMatch) break;

    const a = match.player_a_id;
    const b = match.player_b_id;

    //If a or b hasn't got a rating ten set it to 1000
    if (!ratings.has(a)) ratings.set(a, 1000);
    if (!ratings.has(b)) ratings.set(b, 1000);

    //Adds the elo change to their rating
    ratings.set(a, ratings.get(a)! + (match.elo_change_a ?? 0));
    ratings.set(b, ratings.get(b)! + (match.elo_change_b ?? 0));
  }

  //Iterates through all matches from the match
  for (const match of allMatches as MatchRow[]) {
    //Skips matches that are less than the match
    if (match.match_number! < fromMatch) continue;

    const a = match.player_a_id;
    const b = match.player_b_id;

    //If a or b hasn't got a rating ten set it to 1000
    if (!ratings.has(a)) ratings.set(a, 1000);
    if (!ratings.has(b)) ratings.set(b, 1000);

    //Fetches the mapped rating
    const ratingA = ratings.get(match.player_a_id)!;
    const ratingB = ratings.get(match.player_b_id)!;

    //Calculates the elo
    const result = calculateElo({
      ratingA,
      ratingB,
      scoreA: match.score_a,
      scoreB: match.score_b,
      gamePoints: match.game_points,
    });

    //Updates the match in database
    await supabase.from("matches").update({
      elo_before_a: ratingA,
      elo_before_b: ratingB,
      elo_change_a: result.eloChangeA,
      elo_change_b: result.eloChangeB,
      winner: result.winner === "A"
        ? match.player_a_id
        : match.player_b_id,
    }).eq("id", match.id);

    //Set the mapped ratings to the new ratings
    ratings.set(a, result.newRatingA);
    ratings.set(b, result.newRatingB);
  }

  //Updates all player ratings
  for (const [playerId, elo] of ratings.entries()) {
    await supabase.from("players").update({ elo }).eq("id", playerId);
  }
}