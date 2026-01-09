"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { MatchesRow, PlayersRow, GroupsRow } from "@/types/database";

/* ---------- Helpers ---------- */
function avg(arr: (number | null | undefined)[]) {
	const filtered = arr.filter((v): v is number => v != null);
	if (!filtered.length) return 0;
	return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

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
			].filter(Boolean) as string[];

			const { data: playerData } = await supabase
				.from("players")
				.select("*")
				.in("id", playerIds);

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

	/* ---------- Always call hooks ---------- */
	const preMatchWinChance = useMemo(() => {
		if (!match) return null;

		const rA = avg([
			players.get(match.player_a1_id)?.singles_elo,
			match.player_a2_id
				? players.get(match.player_a2_id)?.singles_elo
				: 0,
		]);
		const rB = avg([
			players.get(match.player_b1_id)?.singles_elo,
			match.player_b2_id
				? players.get(match.player_b2_id)?.singles_elo
				: 0,
		]);

		if (rA === 0 && rB === 0) return null;

		const chanceA = expectedScore(rA, rB);
		const chanceB = 1 - chanceA;
		return {
			teamA: Math.round(chanceA * 100),
			teamB: Math.round(chanceB * 100),
		};
	}, [match, players]);

	const eloPerPoint = useMemo(() => {
		if (!match) return 0;
		const diff = Math.abs(match.score_a - match.score_b);
		if (diff === 0) return 0;
		return Math.abs(match.elo_change_a ?? 0) / diff;
	}, [match]);

	if (loading || !match) {
		return (
			<main className="max-w-4xl mx-auto px-4 py-16 text-center text-text-muted">
				Loading match…
			</main>
		);
	}

	/* ---------- Teams ---------- */
	const teamA = [
		{ id: match.player_a1_id, eloChange: match.elo_change_a },
		match.player_a2_id && {
			id: match.player_a2_id,
			eloChange: match.elo_change_a,
		},
	].filter(Boolean) as { id: string; eloChange: number | null }[];

	const teamB = [
		{ id: match.player_b1_id, eloChange: match.elo_change_b },
		match.player_b2_id && {
			id: match.player_b2_id,
			eloChange: match.elo_change_b,
		},
	].filter(Boolean) as { id: string; eloChange: number | null }[];

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

			{/* STATS ROW */}
			<section className="flex flex-wrap justify-between gap-4 text-center text-sm">
				<div>
					<p className="text-text-muted">Match #</p>
					<p className="font-bold">{match.match_number}</p>
				</div>
				<div>
					<p className="text-text-muted">Score</p>
					<p className="font-bold">
						{match.score_a} - {match.score_b}
					</p>
				</div>
				<div>
					<p className="text-text-muted">Elo / pt</p>
					<p className="font-bold">{eloPerPoint.toFixed(2)}</p>
				</div>
			</section>

			{/* PRE-MATCH WIN CHANCE CARD */}
			{preMatchWinChance && (
				<section className="bg-card p-4 rounded-lg text-center flex justify-around text-lg font-medium space-x-4">
					<div>Team A win chance: {preMatchWinChance.teamA}%</div>
					<div>Team B win chance: {preMatchWinChance.teamB}%</div>
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
										players.get(p.id)?.player_name ??
										"unknown"
									}`}
									className="hover:underline font-medium"
								>
									{players.get(p.id)?.player_name ??
										"Unknown"}
								</Link>
							))}
						</div>
						<p className="text-sm text-text-muted">
							Elo change:{" "}
							{teamA.map((p) => p.eloChange ?? 0).join(" / ")}
						</p>
					</div>
					<div className="text-right">
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
										players.get(p.id)?.player_name ??
										"unknown"
									}`}
									className="hover:underline font-medium"
								>
									{players.get(p.id)?.player_name ??
										"Unknown"}
								</Link>
							))}
						</div>
						<p className="text-sm text-text-muted">
							Elo change:{" "}
							{teamB.map((p) => p.eloChange ?? 0).join(" / ")}
						</p>
					</div>
					<div className="text-right">
						<p className="text-3xl font-bold">{match.score_b}</p>
					</div>
				</div>
			</section>

			{/* GROUP */}
			{group && (
				<section className="text-center text-sm text-text-muted">
					Group:{" "}
					<span className="font-medium">{group.group_name}</span>
				</section>
			)}
		</main>
	);
}
