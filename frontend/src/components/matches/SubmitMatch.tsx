"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PlayersRow, TournamentsRow } from "@/types/database";

/* =======================
   Elo preview (MATCHES BACKEND)
======================= */

const BASE_K = 50;
const IDEAL_POINTS = 7;

function expectedScore(rA: number, rB: number) {
	return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function effectiveK(
	scoreA: number,
	scoreB: number,
	gamePoints: number,
	isTournament: boolean
) {
	if (isTournament) return BASE_K;
	const diff = Math.abs(scoreA - scoreB) / gamePoints;
	const length = gamePoints / IDEAL_POINTS;
	return BASE_K * diff * length;
}

function calculateEloPreview(
	rA: number,
	rB: number,
	scoreA: number,
	scoreB: number,
	isTournament: boolean
) {
	if (scoreA === scoreB) return null;

	const gamePoints = Math.max(scoreA, scoreB);
	const winner = scoreA > scoreB ? "A" : "B";
	const actualA = winner === "A" ? 1 : 0;

	const expectedA = expectedScore(rA, rB);
	const k = effectiveK(scoreA, scoreB, gamePoints, isTournament);
	const deltaA = Math.round(k * (actualA - expectedA));

	return {
		winner,
		eloChangeA: deltaA,
		eloChangeB: -deltaA,
	};
}

/* =======================
   Component
======================= */

export default function SubmitMatch() {
	const [players, setPlayers] = useState<PlayersRow[]>([]);
	const [tournaments, setTournaments] = useState<TournamentsRow[]>([]);

	const [isDoubles, setIsDoubles] = useState(false);

	const [a1, setA1] = useState("");
	const [a2, setA2] = useState("");
	const [b1, setB1] = useState("");
	const [b2, setB2] = useState("");

	const [scoreA, setScoreA] = useState(0);
	const [scoreB, setScoreB] = useState(0);
	const [tournamentId, setTournamentId] = useState<string | null>(null);

	const [loading, setLoading] = useState(false);
	const [canSubmit, setCanSubmit] = useState(true);

	/* =======================
	   Load players + active tournaments
	======================= */

	useEffect(() => {
		supabase
			.from("players")
			.select("*")
			.then(({ data }) => {
				if (data) setPlayers(data);
			});

		const today = new Date().toISOString();

		supabase
			.from("tournaments")
			.select("*")
			.lte("start_date", today)
			.gte("end_date", today)
			.then(({ data }) => {
				if (data) setTournaments(data);
			});
	}, []);

	/* =======================
	   Elo preview
	======================= */

	const eloPreview = useMemo(() => {
		if (!a1 || !b1) return null;

		const pA1 = players.find((p) => p.id === a1);
		const pB1 = players.find((p) => p.id === b1);
		if (!pA1 || !pB1) return null;

		if (!isDoubles) {
			return calculateEloPreview(
				pA1.singles_elo,
				pB1.singles_elo,
				scoreA,
				scoreB,
				Boolean(tournamentId)
			);
		}

		if (!a2 || !b2) return null;

		const pA2 = players.find((p) => p.id === a2);
		const pB2 = players.find((p) => p.id === b2);
		if (!pA2 || !pB2) return null;

		const teamA = (pA1.doubles_elo + pA2.doubles_elo) / 2;
		const teamB = (pB1.doubles_elo + pB2.doubles_elo) / 2;

		return calculateEloPreview(
			teamA,
			teamB,
			scoreA,
			scoreB,
			Boolean(tournamentId)
		);
	}, [a1, a2, b1, b2, scoreA, scoreB, isDoubles, tournamentId, players]);

	/* =======================
	   Submit
	======================= */

	async function submitMatch(e: React.FormEvent) {
		e.preventDefault();
		if (!canSubmit || loading) return;

		setLoading(true);
		setCanSubmit(false);
		setTimeout(() => setCanSubmit(true), 5000);

		try {
			const session = await supabase.auth.getSession();
			if (!session.data.session) throw new Error("Not signed in");

			const endpoint = isDoubles
				? "/matches/submit/doubles"
				: "/matches/submit/singles";

			const body: Record<string, unknown> = {
				player_a1_id: a1,
				player_b1_id: b1,
				score_a: scoreA,
				score_b: scoreB,
				tournament_id: tournamentId,
			};

			if (isDoubles) {
				body.player_a2_id = a2;
				body.player_b2_id = b2;
			}

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.data.session.access_token}`,
					},
					body: JSON.stringify(body),
				}
			);

			if (!res.ok) {
				const msg = await res.text();
				throw new Error(msg);
			}

			alert("Match submitted!");
			setScoreA(0);
			setScoreB(0);
			setA1("");
			setA2("");
			setB1("");
			setB2("");
		} catch (err) {
			alert(err instanceof Error ? err.message : "Submit failed");
		} finally {
			setLoading(false);
		}
	}

	/* =======================
	   UI
	======================= */

	return (
		<div className="max-w-4xl mx-auto px-4 py-16 space-y-10">
			<section className="text-center space-y-3">
				<h1 className="text-4xl font-extrabold tracking-tight">
					Submit Match
				</h1>
				<p className="text-text-muted">
					Singles or doubles — Elo updates instantly.
				</p>
			</section>

			<form
				onSubmit={submitMatch}
				className="bg-card p-6 sm:p-8 rounded-2xl space-y-6 hover-card"
			>
				{/* Mode toggle */}
				<div className="flex justify-center gap-2">
					<button
						type="button"
						onClick={() => setIsDoubles(false)}
						className={`px-4 py-2 rounded-lg ${
							!isDoubles ? "bg-primary text-white" : ""
						}`}
					>
						Singles
					</button>
					<button
						type="button"
						onClick={() => setIsDoubles(true)}
						className={`px-4 py-2 rounded-lg ${
							isDoubles ? "bg-primary text-white" : ""
						}`}
					>
						Doubles
					</button>
				</div>

				{/* Tournament */}
				<select
					value={tournamentId ?? ""}
					onChange={(e) => setTournamentId(e.target.value || null)}
					className="w-full rounded-lg px-3 py-2"
				>
					<option value="">Casual match</option>
					{tournaments.map((t) => (
						<option key={t.id} value={t.id}>
							{t.tournament_name}
						</option>
					))}
				</select>

				{/* Teams */}
				<div className="grid grid-cols-2 gap-6">
					<div className="space-y-2">
						<h3 className="font-semibold">Team A</h3>
						<select
							value={a1}
							onChange={(e) => setA1(e.target.value)}
						>
							<option value="">Player A1</option>
							{players.map((p) => (
								<option key={p.id} value={p.id}>
									{p.player_name}
								</option>
							))}
						</select>
						{isDoubles && (
							<select
								value={a2}
								onChange={(e) => setA2(e.target.value)}
							>
								<option value="">Player A2</option>
								{players.map((p) => (
									<option key={p.id} value={p.id}>
										{p.player_name}
									</option>
								))}
							</select>
						)}
					</div>

					<div className="space-y-2">
						<h3 className="font-semibold text-right">Team B</h3>
						<select
							value={b1}
							onChange={(e) => setB1(e.target.value)}
						>
							<option value="">Player B1</option>
							{players.map((p) => (
								<option key={p.id} value={p.id}>
									{p.player_name}
								</option>
							))}
						</select>
						{isDoubles && (
							<select
								value={b2}
								onChange={(e) => setB2(e.target.value)}
							>
								<option value="">Player B2</option>
								{players.map((p) => (
									<option key={p.id} value={p.id}>
										{p.player_name}
									</option>
								))}
							</select>
						)}
					</div>
				</div>

				{/* Scores */}
				<div className="grid grid-cols-2 gap-4">
					<input
						type="number"
						min={0}
						value={scoreA}
						onChange={(e) => setScoreA(+e.target.value)}
						placeholder="Score A"
					/>
					<input
						type="number"
						min={0}
						value={scoreB}
						onChange={(e) => setScoreB(+e.target.value)}
						placeholder="Score B"
					/>
				</div>

				{/* Elo preview */}
				{eloPreview && (
					<div className="text-sm text-text-muted text-center">
						{eloPreview.winner === "A" ? "Team A" : "Team B"} wins ·{" "}
						<span className="font-medium">
							{eloPreview.eloChangeA > 0 ? "+" : ""}
							{eloPreview.eloChangeA}
						</span>{" "}
						Elo
					</div>
				)}

				<button
					disabled={loading || !canSubmit}
					className="w-full py-3 rounded-lg font-semibold"
				>
					{loading ? "Submitting..." : "Submit Match"}
				</button>

				{!canSubmit && (
					<p className="text-xs text-center text-red-500">
						Please wait 5 seconds before submitting again
					</p>
				)}
			</form>
		</div>
	);
}
