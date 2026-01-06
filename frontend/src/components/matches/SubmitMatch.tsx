"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/* =====================
   Elo logic
===================== */

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

function calculateElo(
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

	/* =====================
	   Validation
	===================== */

	const selectedPlayers = useMemo(
		() => new Set([a1, a2, b1, b2].filter(Boolean)),
		[a1, a2, b1, b2]
	);

	const allPlayersSelected = isDoubles ? a1 && a2 && b1 && b2 : a1 && b1;

	const noDuplicates =
		selectedPlayers.size === [a1, a2, b1, b2].filter(Boolean).length;

	const scoreDiffValid = Math.abs(scoreA - scoreB) === 2;

	const formValid = allPlayersSelected && noDuplicates && scoreDiffValid;

	let validationMessage = "";

	if (!allPlayersSelected) {
		validationMessage = "Please select all players.";
	} else if (!noDuplicates) {
		validationMessage = "Each player can only be selected once.";
	} else if (!scoreDiffValid) {
		validationMessage = "The winning team must win by exactly 2 points.";
	}

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

			await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.data.session.access_token}`,
				},
				body: JSON.stringify(body),
			});

			alert("Match submitted successfully");

			setA1("");
			setA2("");
			setB1("");
			setB2("");
			setScoreA(0);
			setScoreB(0);
		} finally {
			setLoading(false);
		}
	}

	/* =====================
	   UI
	===================== */

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-16">
			<section className="max-w-2xl mx-auto">
				<form onSubmit={submitMatch} className="space-y-6">
					<div className="grid grid-cols-2 gap-6">
						{["A", "B"].map((team) => (
							<div key={team} className="flex flex-col gap-2">
								<label className="font-medium">
									Team {team}
								</label>

								{(isDoubles ? ["1", "2"] : ["1"]).map(
									(slot) => {
										const value =
											team === "A"
												? slot === "1"
													? a1
													: a2
												: slot === "1"
												? b1
												: b2;

										const setter =
											team === "A"
												? slot === "1"
													? setA1
													: setA2
												: slot === "1"
												? setB1
												: setB2;

										return (
											<select
												key={slot}
												className={fieldClass}
												value={value}
												onChange={(e) =>
													setter(e.target.value)
												}
											>
												<option value="">
													Player {team}
													{slot}
												</option>
												{players.map((p) => (
													<option
														key={p.id}
														value={p.id}
														disabled={
															selectedPlayers.has(
																p.id
															) && p.id !== value
														}
													>
														{p.player_name}
													</option>
												))}
											</select>
										);
									}
								)}
							</div>
						))}
					</div>

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

					<button
						type="submit"
						disabled={!formValid || loading || !canSubmit}
						className="w-full px-4 py-3 rounded-lg"
					>
						Submit Match
					</button>

					{!formValid && (
						<p className="text-xs text-center text-text-muted">
							{validationMessage}
						</p>
					)}

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
