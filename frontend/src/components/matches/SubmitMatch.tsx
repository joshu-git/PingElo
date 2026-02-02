"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/* =====================
   Elo logic
===================== */

const BASE_K = 50;
const IDEAL_POINTS = 7;

function expectedScore(rA: number, rB: number) {
	return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function effectiveK(scoreA: number, scoreB: number, gamePoints: number) {
	const diff = Math.abs(scoreA - scoreB) / gamePoints;
	const length = gamePoints / IDEAL_POINTS;
	return BASE_K * diff * length;
}

function calculateElo(
	rA: number,
	rB: number,
	scoreA: number,
	scoreB: number,
	isTournament: boolean
) {
	const winner = scoreA > scoreB ? "A" : "B";

	//Tournament: guaranteed + or - 15
	if (isTournament) {
		return {
			winner,
			eloChangeA: winner === "A" ? 15 : -15,
			eloChangeB: winner === "A" ? -15 : 15,
		};
	}

	// Casual match: normal Elo calculation
	const actualA = winner === "A" ? 1 : 0;
	const expectedA = expectedScore(rA, rB);
	const k = effectiveK(scoreA, scoreB, Math.max(scoreA, scoreB));
	const deltaA = Math.round(k * (actualA - expectedA));

	return {
		winner,
		eloChangeA: deltaA,
		eloChangeB: -deltaA,
	};
}

/* =====================
   Types
===================== */

type Player = {
	id: string;
	player_name: string;
	singles_elo: number;
	doubles_elo: number;
};

type Tournament = {
	id: string;
	tournament_name: string;
};

/* =====================
   Component
===================== */

export default function SubmitMatch() {
	const [players, setPlayers] = useState<Player[]>([]);
	const [tournaments, setTournaments] = useState<Tournament[]>([]);
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

	const fieldClass =
		"w-full rounded-lg px-4 py-3 bg-card border border-border";

	/* =====================
	   Load data
	===================== */

	useEffect(() => {
		supabase
			.from("players")
			.select("*")
			.then(({ data }) => {
				if (data) setPlayers(data);
			});

		supabase
			.from("tournaments")
			.select("id, tournament_name")
			.eq("started", true)
			.eq("completed", false)
			.then(({ data }) => {
				if (data) setTournaments(data);
			});
	}, []);

	/* =====================
	   Helper: available players
	===================== */

	function availablePlayers(currentValue: string) {
		const selected = new Set([a1, a2, b1, b2].filter(Boolean));
		selected.delete(currentValue);
		return players.filter((p) => !selected.has(p.id));
	}

	/* =====================
	   Validation
	===================== */

	const validationErrors = useMemo(() => {
		const errors: string[] = [];

		// Must select at least one player on each team
		if (!a1 || !b1) {
			errors.push("Please select Player A1 and Player B1.");
		}

		// Doubles: must select 2 players each
		if (isDoubles && (!a2 || !b2)) {
			errors.push("Please select Player A2 and Player B2.");
		}

		// No duplicate players
		const selected = [a1, a2, b1, b2].filter(Boolean);
		if (new Set(selected).size !== selected.length) {
			errors.push("Each player can only be selected once.");
		}

		// Score validation: must win by at least 2 points
		if (Math.abs(scoreA - scoreB) < 2) {
			errors.push("A match must be won by at least 2 points.");
		}

		return errors;
	}, [a1, a2, b1, b2, scoreA, scoreB, isDoubles]);

	const formValid = validationErrors.length === 0;

	/* =====================
	   Elo preview
	===================== */

	const eloPreview = useMemo(() => {
		if (!formValid) return null;

		const pA1 = players.find((p) => p.id === a1);
		const pB1 = players.find((p) => p.id === b1);
		if (!pA1 || !pB1) return null;

		if (!isDoubles) {
			return calculateElo(
				pA1.singles_elo,
				pB1.singles_elo,
				scoreA,
				scoreB,
				Boolean(tournamentId)
			);
		}

		const pA2 = players.find((p) => p.id === a2);
		const pB2 = players.find((p) => p.id === b2);
		if (!pA2 || !pB2) return null;

		const teamA = (pA1.doubles_elo + pA2.doubles_elo) / 2;
		const teamB = (pB1.doubles_elo + pB2.doubles_elo) / 2;

		return calculateElo(
			teamA,
			teamB,
			scoreA,
			scoreB,
			Boolean(tournamentId)
		);
	}, [
		players,
		a1,
		a2,
		b1,
		b2,
		scoreA,
		scoreB,
		isDoubles,
		tournamentId,
		formValid,
	]);

	/* =====================
	   Submit
	===================== */

	async function submitMatch(e: React.FormEvent) {
		e.preventDefault();
		if (!formValid || !canSubmit || loading) return;

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

			if (!res.ok) throw new Error(await res.text());

			alert("Match submitted successfully");

			setScoreA(0);
			setScoreB(0);
			setA1("");
			setA2("");
			setB1("");
			setB2("");
		} finally {
			setLoading(false);
		}
	}

	/* =====================
	   UI
	===================== */

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-16">
			{/* HERO */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
					Submit Match
				</h1>
				<p className="text-lg max-w-2xl mx-auto">
					Record a match and preview Elo changes before submitting.
				</p>
			</section>

			<section className="max-w-2xl mx-auto space-y-8">
				<form onSubmit={submitMatch} className="space-y-6">
					{/* Mode toggle */}
					<div className="flex justify-center gap-2">
						<button
							type="button"
							onClick={() => setIsDoubles(false)}
							className={`px-4 py-2 rounded-lg ${
								!isDoubles ? "font-semibold" : "text-text-muted"
							}`}
						>
							Singles
						</button>
						<button
							type="button"
							onClick={() => setIsDoubles(true)}
							className={`px-4 py-2 rounded-lg ${
								isDoubles ? "font-semibold" : "text-text-muted"
							}`}
						>
							Doubles
						</button>

						{/* Back to Matches */}
						<Link href="/matches">
							<button
								type="button"
								className="px-4 py-2 rounded-lg text-text-muted hover:text-text"
							>
								Matches
							</button>
						</Link>
					</div>

					{/* Tournament */}
					<select
						className={fieldClass}
						value={tournamentId ?? ""}
						onChange={(e) =>
							setTournamentId(e.target.value || null)
						}
					>
						<option value="">Casual Match</option>
						{tournaments.map((t) => (
							<option key={t.id} value={t.id}>
								{t.tournament_name}
							</option>
						))}
					</select>

					{/* Teams */}
					<div className="grid grid-cols-2 gap-6">
						{/* Team A */}
						<div className="space-y-2">
							<label className="font-medium">Team A</label>
							<select
								className={fieldClass}
								value={a1}
								onChange={(e) => setA1(e.target.value)}
							>
								<option value="">Player A1</option>
								{availablePlayers(a1).map((p) => (
									<option key={p.id} value={p.id}>
										{p.player_name}
									</option>
								))}
							</select>
							{isDoubles && (
								<select
									className={fieldClass}
									value={a2}
									onChange={(e) => setA2(e.target.value)}
								>
									<option value="">Player A2</option>
									{availablePlayers(a2).map((p) => (
										<option key={p.id} value={p.id}>
											{p.player_name}
										</option>
									))}
								</select>
							)}
						</div>

						{/* Team B */}
						<div className="space-y-2">
							<label className="font-medium">Team B</label>
							<select
								className={fieldClass}
								value={b1}
								onChange={(e) => setB1(e.target.value)}
							>
								<option value="">Player B1</option>
								{availablePlayers(b1).map((p) => (
									<option key={p.id} value={p.id}>
										{p.player_name}
									</option>
								))}
							</select>
							{isDoubles && (
								<select
									className={fieldClass}
									value={b2}
									onChange={(e) => setB2(e.target.value)}
								>
									<option value="">Player B2</option>
									{availablePlayers(b2).map((p) => (
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
							className={fieldClass}
							value={scoreA}
							onChange={(e) => setScoreA(+e.target.value)}
							placeholder="Score A"
						/>
						<input
							type="number"
							min={0}
							className={fieldClass}
							value={scoreB}
							onChange={(e) => setScoreB(+e.target.value)}
							placeholder="Score B"
						/>
					</div>

					{/* Elo preview */}
					{eloPreview && (
						<div className="text-sm text-text-muted text-center space-y-1">
							<p>
								Team A:{" "}
								<span className="font-medium">
									{eloPreview.eloChangeA > 0 ? "+" : ""}
									{eloPreview.eloChangeA}
								</span>
							</p>
							<p>
								Team B:{" "}
								<span className="font-medium">
									{eloPreview.eloChangeB > 0 ? "+" : ""}
									{eloPreview.eloChangeB}
								</span>
							</p>
						</div>
					)}

					{/* Submit button */}
					<button
						type="submit"
						disabled={!formValid || loading || !canSubmit}
						className="w-full px-4 py-3 rounded-lg"
					>
						{loading ? "Submitting…" : "Submit Match"}
					</button>

					{/* Validation errors */}
					{validationErrors.map((err) => (
						<p
							key={err}
							className="text-xs text-center text-text-muted"
						>
							{err}
						</p>
					))}

					{/* Cooldown */}
					{!canSubmit && (
						<p className="text-xs text-center text-text-muted">
							Please wait 5 seconds before submitting another
							match.
						</p>
					)}
				</form>
			</section>
		</main>
	);
}
