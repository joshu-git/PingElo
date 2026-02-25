import { supabase } from "../libs/supabase.js";

export const LEVELS_XP = [
	13, 33, 63, 108, 178, 283, 443, 683, 1043, 1500,
] as const;

export const MAX_LEVEL = LEVELS_XP.length;
export const FLOKENS_PER_LEVEL = 5;

//Determine level from monthly XP
export function getLevelFromMonthlyXp(monthlyXp: number): number {
	let level = 0;

	for (const [index, xpRequired] of LEVELS_XP.entries()) {
		if (monthlyXp >= xpRequired) level = index + 1;
		else break;
	}

	return Math.min(level, MAX_LEVEL);
}

//Multiplier for paid users / tournament matches
function getXpMultiplier(isPaid: boolean, isTournament: boolean): number {
	let multiplier = 1;
	if (isPaid) multiplier += 0.5;
	if (isTournament) multiplier += 0.25;
	return multiplier;
}

function getBaseXp(isWinner: boolean): number {
	return isWinner ? 10 : 5;
}

//Apply XP and handle flokens for level-ups
export async function applyMatchXp(params: {
	playerId: string;
	isWinner: boolean;
	isTournament: boolean;
}) {
	const { playerId, isWinner, isTournament } = params;

	//Load player + stats
	const { data: player, error: playerError } = await supabase
		.from("pe_players")
		.select("monthly_xp, total_xp, account_id")
		.eq("id", playerId)
		.single();

	if (playerError || !player) throw playerError;

	const { data: stats } = await supabase
		.from("pe_player_stats")
		.select("level")
		.eq("player_id", playerId)
		.single();

	const oldLevel = stats?.level ?? 0;

	//Check subscription
	let isPaid = false;
	if (player.account_id) {
		const { data: sub } = await supabase
			.from("subscriptions")
			.select("status")
			.eq("account_id", player.account_id)
			.eq("status", "active")
			.maybeSingle();

		isPaid = !!sub;
	}

	//Calculate XP
	const baseXp = getBaseXp(isWinner);
	const multiplier = getXpMultiplier(isPaid, isTournament);
	const earnedXp = Math.floor(baseXp * multiplier);

	const newMonthlyXp = player.monthly_xp + earnedXp;
	const newTotalXp = player.total_xp + earnedXp;
	const newLevel = getLevelFromMonthlyXp(newMonthlyXp);

	//Persist XP
	await supabase
		.from("pe_players")
		.update({
			monthly_xp: newMonthlyXp,
			total_xp: newTotalXp,
		})
		.eq("id", playerId);

	//Persist level
	await supabase.from("pe_player_stats").upsert({
		player_id: playerId,
		level: newLevel,
		updated_at: new Date().toISOString(),
	});

	//Grant flokens on level up
	const levelsGained = Math.max(0, newLevel - oldLevel);
	const flokensEarned = levelsGained * FLOKENS_PER_LEVEL;

	if (flokensEarned > 0 && player.account_id) {
		const { data: account } = await supabase
			.from("account")
			.select("flokens")
			.eq("id", player.account_id)
			.single();

		await supabase
			.from("account")
			.update({
				flokens: (account?.flokens ?? 0) + flokensEarned,
			})
			.eq("id", player.account_id);

		await supabase.from("flokens_history").insert({
			account_id: player.account_id,
			change: flokensEarned,
			source: "xp_level_up",
		});
	}

	//XP history
	await supabase.from("pe_xp_history").insert({
		player_id: playerId,
		xp_change: earnedXp,
		source: isTournament ? "tournament_match" : "match",
		multiplier,
	});
}
