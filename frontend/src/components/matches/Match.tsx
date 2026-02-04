"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { MatchesRow, PlayersRow, GroupsRow } from "@/types/database";

//Elo helpers
function expectedScore(rA: number, rB: number) {
	return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

const averageElo = (...elos: (number | null | undefined)[]) => {
	const valid = elos.filter((e): e is number => e != null);
	return valid.length
		? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
		: 0;
};

type TeamPlayer = { id: string; before?: number | null };

const buildTeam = (
	ids: (string | null | undefined)[],
	elos: (number | null | undefined)[]
): TeamPlayer[] =>
	ids
		.map((id, i) => (id ? { id, before: elos[i] } : null))
		.filter(Boolean) as TeamPlayer[];

export default function Match() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();

	const [match, setMatch] = useState<MatchesRow | null>(null);
	const [players, setPlayers] = useState<Map<string, PlayersRow>>(new Map());
	const [group, setGroup] = useState<GroupsRow | null>(null);
	const [tournamentName, setTournamentName] = useState<string>("Casual");
	const [tournamentId, setTournamentId] = useState<string | null>(null);
	const [createdByName, setCreatedByName] = useState<string>("Unknown");
	const [loading, setLoading] = useState(true);

	//Load match
	useEffect(() => {
		const loadMatch = async () => {
			const { data, error } = await supabase
				.from("matches")
				.select("*")
				.eq("id", id)
				.single();

			if (error || !data) {
				router.push("/matches");
				return;
			}

			setMatch(data);
			setLoading(false);
		};

		loadMatch();
	}, [id, router]);

	//Meta
	useEffect(() => {
		if (!match) return;

		const loadMeta = async () => {
			const playerIds = [
				match.player_a1_id,
				match.player_a2_id,
				match.player_b1_id,
				match.player_b2_id,
			].filter(Boolean) as string[];

			const [
				{ data: playerData },
				{ data: tournamentData },
				{ data: creator },
			] = await Promise.all([
				supabase.from("players").select("*").in("id", playerIds),
				match.tournament_id
					? supabase
							.from("tournaments")
							.select("id, tournament_name")
							.eq("id", match.tournament_id)
							.single()
					: Promise.resolve({ data: null }),
				match.created_by
					? supabase
							.from("players")
							.select("player_name")
							.eq("account_id", match.created_by)
							.single()
					: Promise.resolve({ data: null }),
			]);

			if (playerData)
				setPlayers(new Map(playerData.map((p) => [p.id, p])));

			const firstPlayer = playerData?.[0];
			if (firstPlayer?.group_id) {
				const { data: groupData } = await supabase
					.from("groups")
					.select("*")
					.eq("id", firstPlayer.group_id)
					.single();
				if (groupData) setGroup(groupData);
			}

			if (tournamentData?.tournament_name)
				setTournamentName(tournamentData.tournament_name);

			if (tournamentData?.id) setTournamentId(tournamentData.id);

			if (creator?.player_name) setCreatedByName(creator.player_name);
		};

		loadMeta();
	}, [match]);

	//Helpers
	const eloAfter = (before?: number | null, change?: number | null) =>
		before != null && change != null ? before + change : null;

	const teamAWon = match ? match.score_a > match.score_b : false;

	const teamA = useMemo(() => {
		if (!match) return [];
		return buildTeam(
			[match.player_a1_id, match.player_a2_id],
			[match.elo_before_a1, match.elo_before_a2]
		);
	}, [match]);

	const teamB = useMemo(() => {
		if (!match) return [];
		return buildTeam(
			[match.player_b1_id, match.player_b2_id],
			[match.elo_before_b1, match.elo_before_b2]
		);
	}, [match]);

	//Win probability
	const winChance = useMemo(() => {
		if (!match) return null;

		const teamAElo =
			match.match_type === "singles"
				? (match.elo_before_a1 ?? 0)
				: averageElo(match.elo_before_a1, match.elo_before_a2);

		const teamBElo =
			match.match_type === "singles"
				? (match.elo_before_b1 ?? 0)
				: averageElo(match.elo_before_b1, match.elo_before_b2);

		const a = expectedScore(teamAElo, teamBElo);

		return {
			a: Math.round(a * 100),
			b: Math.round((1 - a) * 100),
		};
	}, [match]);

	//Elo / Point
	const eloPerPoint = useMemo(() => {
		if (!match) return null;

		const scoreDiff = Math.abs(match.score_a - match.score_b);
		if (scoreDiff === 0) return null;

		const winnerEloGain = teamAWon
			? match.elo_change_a
			: match.elo_change_b;

		if (winnerEloGain == null) return null;

		// Same formula works for singles and doubles
		return (winnerEloGain / scoreDiff).toFixed(2);
	}, [match, teamAWon]);

	if (loading || !match) {
		return (
			<main className="max-w-4xl mx-auto px-4 py-16 text-center text-text-muted">
				Loading match…
			</main>
		);
	}

	return (
		<main className="max-w-4xl mx-auto px-4 py-16 space-y-10">
			{/* HEADER */}
			<section className="text-center space-y-3">
				<h1 className="text-3xl md:text-4xl font-extrabold">
					Match Details
				</h1>
				<p className="text-text-muted">
					{match.match_type === "singles" ? "Singles" : "Doubles"} ·{" "}
					{new Date(match.created_at).toLocaleDateString()}
				</p>
			</section>

			{/* STATS BAR */}
			<section className="grid grid-cols-3 gap-4 text-center">
				<Stat label="Winner" value={teamAWon ? "Team A" : "Team B"} />
				<Stat label="Match" value={match.match_number} />
				<Stat label="Elo / Point" value={eloPerPoint ?? "-"} />
			</section>

			{/* WIN PROBABILITY */}
			{winChance && (
				<section className="bg-card rounded-xl px-6 py-4">
					<div className="space-y-3">
						<p className="text-sm text-text-muted text-center">
							Pre-match win probability
						</p>

						<div className="grid grid-cols-3">
							<div className="flex flex-col items-center">
								<p className="text-base font-semibold">
									Team A
								</p>
								<p className="text-xl font-bold">
									{winChance.a}%
								</p>
							</div>

							<div />

							<div className="flex flex-col items-center">
								<p className="text-base font-semibold">
									Team B
								</p>
								<p className="text-xl font-bold">
									{winChance.b}%
								</p>
							</div>
						</div>
					</div>
				</section>
			)}

			{/* MATCH CARD */}
			<section className="bg-card rounded-xl p-6 space-y-6">
				{/* TEAM A */}
				<div className="flex justify-between items-center">
					<div className="space-y-1">
						<p className="text-sm text-text-muted">Team A</p>
						<div className="flex flex-wrap gap-2">
							{teamA.map((p) => (
								<Link
									key={p.id}
									href={`/profile/${
										players.get(p.id)?.player_name
									}`}
									className="hover:underline font-medium"
								>
									{players.get(p.id)?.player_name}
								</Link>
							))}
						</div>
						<p className="text-sm text-text-muted">
							Elo after:{" "}
							{teamA
								.map((p) =>
									eloAfter(p.before, match.elo_change_a)
								)
								.join(" / ")}
						</p>
					</div>

					<div className="text-right">
						<p className="text-sm text-text-muted">
							{match.elo_change_a >= 0 && "+"}
							{match.elo_change_a} Elo
						</p>
						<p className="text-3xl font-bold">{match.score_a}</p>
					</div>
				</div>

				<hr className="border-border" />

				{/* TEAM B */}
				<div className="flex justify-between items-center">
					<div className="space-y-1">
						<p className="text-sm text-text-muted">Team B</p>
						<div className="flex flex-wrap gap-2">
							{teamB.map((p) => (
								<Link
									key={p.id}
									href={`/profile/${
										players.get(p.id)?.player_name
									}`}
									className="hover:underline font-medium"
								>
									{players.get(p.id)?.player_name}
								</Link>
							))}
						</div>
						<p className="text-sm text-text-muted">
							Elo after:{" "}
							{teamB
								.map((p) =>
									eloAfter(p.before, match.elo_change_b)
								)
								.join(" / ")}
						</p>
					</div>

					<div className="text-right">
						<p className="text-sm text-text-muted">
							{match.elo_change_b >= 0 && "+"}
							{match.elo_change_b} Elo
						</p>
						<p className="text-3xl font-bold">{match.score_b}</p>
					</div>
				</div>
			</section>

			<section className="grid grid-cols-3 text-center text-sm text-text-muted mt-4">
				{/* Tournament */}
				<div>
					<p className="text-text-muted">Tournament</p>
					{match.tournament_id ? (
						<Link
							href={`/tournaments/${tournamentId}`}
							className="font-medium hover:underline"
						>
							{tournamentName}
						</Link>
					) : (
						<p className="font-medium">Casual</p>
					)}
				</div>

				{/* Group */}
				<div>
					<p className="text-text-muted">Group</p>
					{group ? (
						<Link
							href={`/groups/${group.group_name}`}
							className="font-medium hover:underline"
						>
							{group.group_name}
						</Link>
					) : (
						<p className="font-medium">—</p>
					)}
				</div>

				{/* Created By */}
				<div>
					<p className="text-text-muted">Created By</p>
					{createdByName ? (
						<Link
							href={`/profile/${createdByName}`}
							className="font-medium hover:underline"
						>
							{createdByName}
						</Link>
					) : (
						<span className="font-medium">Unknown</span>
					)}
				</div>
			</section>
		</main>
	);
}

function Stat({ label, value }: { label: string; value: number | string }) {
	return (
		<div className="text-center">
			<p className="text-sm text-text-muted">{label}</p>
			<p className="text-2xl font-bold">{value}</p>
		</div>
	);
}
