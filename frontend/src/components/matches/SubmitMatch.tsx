"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PlayersRow, TournamentsRow } from "@/types/database";

/* ---------------- Elo Preview (frontend only) ---------------- */

function calculateElo(
	ratingA: number,
	ratingB: number,
	scoreA: number,
	scoreB: number
) {
	const BASE_K = 50;
	const IDEAL_POINTS = 7;

	if (scoreA === scoreB) return null;

	const actualA = scoreA > scoreB ? 1 : 0;
	const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));

	const gamePoints = Math.max(scoreA, scoreB);
	const lengthFactor = gamePoints / IDEAL_POINTS;
	const scoreDiffFactor = Math.abs(scoreA - scoreB) / gamePoints;
	const effectiveK = BASE_K * lengthFactor * scoreDiffFactor;

	const deltaA = Math.round(effectiveK * (actualA - expectedA));

	return {
		winner: actualA === 1 ? "A" : "B",
		eloChangeA: deltaA,
		eloChangeB: -deltaA,
		newRatingA: ratingA + deltaA,
		newRatingB: ratingB - deltaA,
	};
}

/* ---------------- Component ---------------- */

export default function SubmitMatch() {
	const [players, setPlayers] = useState<PlayersRow[]>([]);
	const [tournaments, setTournaments] = useState<TournamentsRow[]>([]);

	const [isDoubles, setIsDoubles] = useState(false);

	const [playerA1, setPlayerA1] = useState("");
	const [playerA2, setPlayerA2] = useState("");
	const [playerB1, setPlayerB1] = useState("");
	const [playerB2, setPlayerB2] = useState("");

	const [scoreA, setScoreA] = useState<number>(0);
	const [scoreB, setScoreB] = useState<number>(0);
	const [tournamentId, setTournamentId] = useState<string | null>(null);

	const [loading, setLoading] = useState(false);
	const [canSubmit, setCanSubmit] = useState(true);

	/* ---------------- Fetch data ---------------- */

	useEffect(() => {
		supabase
			.from("players")
			.select("*")
			.then(({ data }) => {
				if (data) setPlayers(data);
			});

		const now = new Date().toISOString();
		supabase
			.from("tournaments")
			.select("*")
			.lte("start_date", now)
			.gte("end_date", now)
			.then(({ data }) => {
				if (data) {
					setTournaments(data);
					setTournamentId(data[0]?.id ?? null);
				}
			});
	}, []);

	/* ---------------- Elo preview ---------------- */

	const eloPreview = useMemo(() => {
		const a = players.find((p) => p.id === playerA1);
		const b = players.find((p) => p.id === playerB1);
		if (!a || !b) return null;

		const ratingA = isDoubles ? a.doubles_elo : a.singles_elo;
		const ratingB = isDoubles ? b.doubles_elo : b.singles_elo;

		return calculateElo(ratingA, ratingB, scoreA, scoreB);
	}, [players, playerA1, playerB1, scoreA, scoreB, isDoubles]);

	/* ---------------- Submit ---------------- */

	async function submitMatch(e: React.FormEvent) {
		e.preventDefault();
		if (!canSubmit || loading) return;

		if (!playerA1 || !playerB1) return alert("Select all players");
		if (isDoubles && (!playerA2 || !playerB2))
			return alert("Select all players");

		setLoading(true);
		setCanSubmit(false);
		setTimeout(() => setCanSubmit(true), 5000);

		try {
			const session = await supabase.auth.getSession();
			if (!session.data.session) throw new Error("Not authenticated");

			const endpoint = isDoubles ? "doubles" : "singles";

			const body = {
				player_a1_id: playerA1,
				player_a2_id: isDoubles ? playerA2 : undefined,
				player_b1_id: playerB1,
				player_b2_id: isDoubles ? playerB2 : undefined,
				score_a: scoreA,
				score_b: scoreB,
				tournament_id: tournamentId,
			};

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/matches/submit/${endpoint}`,
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
				const json = await res.json();
				throw new Error(json.error ?? "Submission failed");
			}

			alert("Match submitted!");
			setScoreA(0);
			setScoreB(0);
			setPlayerA1("");
			setPlayerA2("");
			setPlayerB1("");
			setPlayerB2("");
		} catch (err) {
			if (err instanceof Error) alert(err.message);
		} finally {
			setLoading(false);
		}
	}

	/* ---------------- UI ---------------- */

	return (
		<div className="max-w-4xl mx-auto px-4 py-16 space-y-12">
			<header className="text-center space-y-2">
				<h1 className="text-4xl font-extrabold tracking-tight">
					Submit Match
				</h1>
				<p className="text-white/60">
					Preview Elo changes before submitting
				</p>
			</header>

			<form
				onSubmit={submitMatch}
				className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6"
			>
				{/* Match type */}
				<div className="flex justify-center gap-2">
					<button
						type="button"
						onClick={() => setIsDoubles(false)}
						className={`px-4 py-2 rounded-xl text-sm font-medium ${
							!isDoubles
								? "bg-purple-600 text-white"
								: "bg-white/5 text-white/60"
						}`}
					>
						Singles
					</button>
					<button
						type="button"
						onClick={() => setIsDoubles(true)}
						className={`px-4 py-2 rounded-xl text-sm font-medium ${
							isDoubles
								? "bg-purple-600 text-white"
								: "bg-white/5 text-white/60"
						}`}
					>
						Doubles
					</button>
				</div>

				{/* Players */}
				<div className="grid grid-cols-2 gap-6">
					{/* Team A */}
					<div className="space-y-3">
						<p className="text-sm font-semibold text-white/70">
							Team A
						</p>
						<select
							value={playerA1}
							onChange={(e) => setPlayerA1(e.target.value)}
							className="w-full input"
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
								value={playerA2}
								onChange={(e) => setPlayerA2(e.target.value)}
								className="w-full input"
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

					{/* Team B */}
					<div className="space-y-3">
						<p className="text-sm font-semibold text-white/70">
							Team B
						</p>
						<select
							value={playerB1}
							onChange={(e) => setPlayerB1(e.target.value)}
							className="w-full input"
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
								value={playerB2}
								onChange={(e) => setPlayerB2(e.target.value)}
								className="w-full input"
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
						className="input"
						placeholder="Score A"
					/>
					<input
						type="number"
						min={0}
						value={scoreB}
						onChange={(e) => setScoreB(+e.target.value)}
						className="input"
						placeholder="Score B"
					/>
				</div>

				{/* Elo preview */}
				{eloPreview && (
					<div className="text-sm text-white/70 border-t border-white/10 pt-4">
						<p>
							Winner:{" "}
							<strong className="text-white">
								Team {eloPreview.winner}
							</strong>
						</p>
						<p>
							Team A: {eloPreview.eloChangeA > 0 && "+"}
							{eloPreview.eloChangeA}
						</p>
						<p>
							Team B: {eloPreview.eloChangeB > 0 && "+"}
							{eloPreview.eloChangeB}
						</p>
					</div>
				)}

				<button
					type="submit"
					disabled={!canSubmit || loading}
					className="w-full bg-purple-600 hover:bg-purple-700 transition rounded-xl py-3 font-semibold"
				>
					{loading ? "Submitting..." : "Submit Match"}
				</button>

				{!canSubmit && (
					<p className="text-xs text-red-400 text-center">
						Please wait 5 seconds before submitting again
					</p>
				)}
			</form>
		</div>
	);
}
