"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { MatchesRow, PlayersRow, GroupsRow } from "@/types/database";

/* ---------- Elo helpers ---------- */
function expectedScore(rA: number, rB: number) {
	return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

export default function Match() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();

	const [match, setMatch] = useState<MatchesRow | null>(null);
	const [players, setPlayers] = useState<Map<string, PlayersRow>>(new Map());
	const [group, setGroup] = useState<GroupsRow | null>(null);
	const [loading, setLoading] = useState(true);

	/* ---------- Load match ---------- */
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

	/* ---------- Load players + group ---------- */
	useEffect(() => {
		if (!match) return;

		const loadMeta = async () => {
			const playerIds = [
				match.player_a1_id,
				match.player_a2_id,
				match.player_b1_id,
				match.player_b2_id,
			].filter(Boolean);

			const { data: playerData } = await supabase
				.from("players")
				.select("*")
				.in("id", playerIds as string[]);

			if (playerData) {
				setPlayers(new Map(playerData.map((p) => [p.id, p])));
			}

			const firstPlayer = playerData?.[0];
			if (firstPlayer?.group_id) {
				const { data: groupData } = await supabase
					.from("groups")
					.select("*")
					.eq("id", firstPlayer.group_id)
					.single();

				if (groupData) setGroup(groupData);
			}
		};

		loadMeta();
	}, [match]);

	/* ---------- Helpers ---------- */
	const eloAfter = (before?: number | null, change?: number | null) =>
		before != null && change != null ? before + change : null;

	const teamAWon = match ? match.score_a > match.score_b : false;

	const teamA = useMemo(() => {
		if (!match) return [];
		return [
			{ id: match.player_a1_id, before: match.elo_before_a1 },
			match.player_a2_id && {
				id: match.player_a2_id,
				before: match.elo_before_a2,
			},
		].filter(Boolean) as { id: string; before?: number | null }[];
	}, [match]);

	const teamB = useMemo(() => {
		if (!match) return [];
		return [
			{ id: match.player_b1_id, before: match.elo_before_b1 },
			match.player_b2_id && {
				id: match.player_b2_id,
				before: match.elo_before_b2,
			},
		].filter(Boolean) as { id: string; before?: number | null }[];
	}, [match]);

	/* ---------- Win probability ---------- */
	const winChance = useMemo(() => {
		if (!match) return null;

		const teamAElo =
			match.match_type === "singles"
				? match.elo_before_a1
				: Math.round(
						((match.elo_before_a1 ?? 0) +
							(match.elo_before_a2 ?? 0)) /
							2
				  );

		const teamBElo =
			match.match_type === "singles"
				? match.elo_before_b1
				: Math.round(
						((match.elo_before_b1 ?? 0) +
							(match.elo_before_b2 ?? 0)) /
							2
				  );

		const a = expectedScore(teamAElo, teamBElo);
		return {
			a: Math.round(a * 100),
			b: Math.round((1 - a) * 100),
		};
	}, [match]);

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
				<Stat label="Match #" value={match.match_number} />
				<Stat
					label="Tournament"
					value={match.tournament_id ? "Yes" : "No"}
				/>
			</section>

			{/* WIN PROBABILITY */}
			{winChance && (
				<section className="bg-card rounded-xl px-6 py-4">
					<div className="space-y-3">
						{/* Title (top + centered) */}
						<p className="text-sm text-text-muted text-center">
							Pre-match win probability
						</p>

						{/* Probabilities (lower, balanced) */}
						<div className="flex justify-between text-sm">
							<div className="text-left">
								<p className="font-medium">Team A</p>
								<p className="text-text-muted">
									{winChance.a}%
								</p>
							</div>

							<div className="text-right">
								<p className="font-medium">Team B</p>
								<p className="text-text-muted">
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

			{group && (
				<section className="text-center text-sm text-text-muted">
					Group:{" "}
					<span className="font-medium">{group.group_name}</span>
				</section>
			)}
		</main>
	);
}

/* ---------- STAT COMPONENT ---------- */
function Stat({ label, value }: { label: string; value: number | string }) {
	return (
		<div className="text-center">
			<p className="text-sm text-text-muted">{label}</p>
			<p className="text-2xl font-bold">{value}</p>
		</div>
	);
}
