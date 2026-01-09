"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { MatchesRow, PlayersRow, GroupsRow } from "@/types/database";

/* ---------- Lightweight Elo expected score ---------- */
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
			const { data } = await supabase
				.from("matches")
				.select("*")
				.eq("id", id)
				.single();

			if (!data) {
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
			const ids = [
				match.player_a1_id,
				match.player_a2_id,
				match.player_b1_id,
				match.player_b2_id,
			].filter((id): id is string => Boolean(id));

			const { data: playerData } = await supabase
				.from("players")
				.select("*")
				.in("id", ids);

			if (playerData) {
				setPlayers(new Map(playerData.map((p) => [p.id, p])));
			}

			const first = playerData?.[0];
			if (first?.group_id) {
				const { data: groupData } = await supabase
					.from("groups")
					.select("*")
					.eq("id", first.group_id)
					.single();
				setGroup(groupData ?? null);
			}
		};

		loadMeta();
	}, [match]);

	const teamAWon = match ? match.score_a > match.score_b : false;

	/* ---------- Elo / Point (winner-based, accurate) ---------- */
	const eloPerPoint = useMemo(() => {
		if (!match) return null;

		const winnerPoints = teamAWon ? match.score_a : match.score_b;
		const eloChange = teamAWon
			? Math.abs(match.elo_change_a)
			: Math.abs(match.elo_change_b);

		if (!winnerPoints) return null;
		return eloChange / winnerPoints;
	}, [match, teamAWon]);

	/* ---------- Pre-match win probability ---------- */
	const winProb = useMemo(() => {
		if (!match || players.size === 0) return null;

		const getElo = (id: string | null, type: "singles" | "doubles") =>
			id ? players.get(id)?.[`${type}_elo`] ?? 0 : 0;

		if (match.match_type === "singles") {
			const rA = getElo(match.player_a1_id, "singles");
			const rB = getElo(match.player_b1_id, "singles");
			return Math.round(expectedScore(rA, rB) * 100);
		}

		const avg = (ids: (string | null)[]) => {
			const valid = ids.filter((id): id is string => Boolean(id));
			return (
				valid.reduce((sum, id) => sum + getElo(id, "doubles"), 0) /
				valid.length
			);
		};

		const rA = avg([
			match.player_a1_id ?? null,
			match.player_a2_id ?? null,
		]);

		const rB = avg([
			match.player_b1_id ?? null,
			match.player_b2_id ?? null,
		]);

		return Math.round(expectedScore(rA, rB) * 100);
	}, [match, players]);

	const eloAfter = (before?: number | null, change?: number | null) =>
		before != null && change != null ? before + change : null;

	const teamA = [
		{ id: match?.player_a1_id, before: match?.elo_before_a1 },
		match?.player_a2_id && {
			id: match.player_a2_id,
			before: match.elo_before_a2,
		},
	].filter(Boolean) as { id: string; before?: number | null }[];

	const teamB = [
		{ id: match?.player_b1_id, before: match?.elo_before_b1 },
		match?.player_b2_id && {
			id: match.player_b2_id,
			before: match.elo_before_b2,
		},
	].filter(Boolean) as { id: string; before?: number | null }[];

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
					{new Date(match.created_at).toLocaleDateString()}
				</p>
			</section>

			{/* STATS LINE (profile-style) */}
			<section className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
				<Stat label="Winner" value={teamAWon ? "Team A" : "Team B"} />
				<Stat
					label="Elo / Point"
					value={eloPerPoint?.toFixed(2) ?? "—"}
				/>
				<Stat label="Match #" value={match.match_number} />
				<Stat
					label="Format"
					value={
						match.match_type === "singles" ? "Singles" : "Doubles"
					}
				/>
			</section>

			{/* WIN PROBABILITY */}
			{winProb != null && (
				<section className="text-center text-sm text-text-muted">
					Pre-match win chance:{" "}
					<span className="font-medium">Team A {winProb}%</span> ·{" "}
					<span className="font-medium">Team B {100 - winProb}%</span>
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

function Stat({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="text-center">
			<p className="text-sm text-text-muted">{label}</p>
			<p className="text-2xl font-bold">{value}</p>
		</div>
	);
}
