"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
	PlayersRow,
	MatchesRow,
	MatchType,
	TournamentsRow,
} from "@/types/database";

// Elo calculation (from backend logic)
function calculateElo(
	ratingA: number,
	ratingB: number,
	scoreA: number,
	scoreB: number
) {
	const BASE_K = 50;
	const IDEAL_POINTS = 7;

	const winner: "A" | "B" = scoreA > scoreB ? "A" : "B";
	const actualA = winner === "A" ? 1 : 0;

	const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
	const expectedB = 1 - expectedA;

	const gamePoints = Math.max(scoreA, scoreB);
	const lengthFactor = gamePoints / IDEAL_POINTS;
	const scoreDiffFactor = Math.abs(scoreA - scoreB) / gamePoints;
	const effectiveK = BASE_K * lengthFactor * scoreDiffFactor;

	const eloChangeA = Math.round(effectiveK * (actualA - expectedA));
	const eloChangeB = -eloChangeA;

	return {
		winner,
		eloChangeA,
		eloChangeB,
		newRatingA: ratingA + eloChangeA,
		newRatingB: ratingB + eloChangeB,
	};
}

export default function SubmitMatch() {
	const [players, setPlayers] = useState<PlayersRow[]>([]);
	const [tournaments, setTournaments] = useState<TournamentsRow[]>([]);

	const [matchType, setMatchType] = useState<MatchType>("singles");
	const [playerA1, setPlayerA1] = useState("");
	const [playerA2, setPlayerA2] = useState("");
	const [playerB1, setPlayerB1] = useState("");
	const [playerB2, setPlayerB2] = useState("");
	const [scoreA, setScoreA] = useState(0);
	const [scoreB, setScoreB] = useState(0);
	const [tournamentId, setTournamentId] = useState<string | null>(null);

	const [eloPreview, setEloPreview] = useState<{
		winner: "A" | "B";
		eloChangeA: number;
		eloChangeB: number;
		newRatingA: number;
		newRatingB: number;
	} | null>(null);

	const [loading, setLoading] = useState(false);
	const [canSubmit, setCanSubmit] = useState(true);

	// Fetch players and active tournaments
	useEffect(() => {
		supabase
			.from("players")
			.select("*")
			.then(({ data }) => {
				if (data) setPlayers(data);
			});

		supabase
			.from("tournaments")
			.select("*")
			.gt("start_date", new Date().toISOString())
			.or(`end_date.gte.${new Date().toISOString()}`)
			.then(({ data }) => {
				if (data) setTournaments(data);
				if (data && data.length > 0) setTournamentId(data[0].id);
			});
	}, []);

	// Calculate Elo preview
	useEffect(() => {
		const pA = players.find((p) => p.id === playerA1);
		const pB = players.find((p) => p.id === playerB1);
		if (!pA || !pB) return;

		const ratingA =
			matchType === "singles" ? pA.singles_elo : pA.doubles_elo;
		const ratingB =
			matchType === "singles" ? pB.singles_elo : pB.doubles_elo;

		setEloPreview(calculateElo(ratingA, ratingB, scoreA, scoreB));
	}, [playerA1, playerB1, scoreA, scoreB, matchType, players]);

	async function submitMatch(e: React.FormEvent) {
		e.preventDefault();
		if (!canSubmit) return;

		if (
			!playerA1 ||
			!playerB1 ||
			(matchType === "doubles" && (!playerA2 || !playerB2))
		) {
			alert("Please select all required players.");
			return;
		}

		setLoading(true);
		setCanSubmit(false);

		setTimeout(() => setCanSubmit(true), 5000); // 5s cooldown

		try {
			const session = await supabase.auth.getSession();
			if (!session.data.session) throw new Error("Not logged in");

			const payload: Partial<MatchesRow> & { match_type: MatchType } = {
				match_type: matchType,
				player_a1_id: playerA1,
				player_b1_id: playerB1,
				score_a: scoreA,
				score_b: scoreB,
				tournament_id: tournamentId,
				elo_before_a1:
					players.find((p) => p.id === playerA1)?.singles_elo ?? 1000,
				elo_before_b1:
					players.find((p) => p.id === playerB1)?.singles_elo ?? 1000,
			};

			if (matchType === "doubles") {
				payload.player_a2_id = playerA2;
				payload.player_b2_id = playerB2;
				payload.elo_before_a2 =
					players.find((p) => p.id === playerA2)?.doubles_elo ?? 1000;
				payload.elo_before_b2 =
					players.find((p) => p.id === playerB2)?.doubles_elo ?? 1000;
			}

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/matches/submit/singles`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.data.session.access_token}`,
					},
					body: JSON.stringify(payload),
				}
			);

			if (!res.ok) {
				const text = await res.text();
				throw new Error(text || "Failed to submit match");
			}

			const json = await res.json();
			alert("Match submitted successfully!");
			setScoreA(0);
			setScoreB(0);
			setPlayerA1("");
			setPlayerB1("");
			setPlayerA2("");
			setPlayerB2("");
		} catch (err: unknown) {
			let message = "Failed to submit match";
			if (err instanceof Error) message = err.message;
			alert(message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="max-w-5xl mx-auto px-4 py-16 space-y-16">
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
					Submit Match
				</h1>
				<p className="text-lg max-w-2xl mx-auto">
					Submit a match and see Elo preview before submitting.
				</p>
			</section>

			<form
				onSubmit={submitMatch}
				className="bg-black/40 border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 max-w-2xl mx-auto shadow-xl"
			>
				{/* Match type toggle */}
				<div className="flex justify-center gap-4">
					<button
						type="button"
						className={`px-4 py-2 rounded-xl ${
							matchType === "singles"
								? "bg-purple-600 text-white"
								: "bg-gray-800 text-gray-300"
						}`}
						onClick={() => setMatchType("singles")}
					>
						Singles
					</button>
					<button
						type="button"
						className={`px-4 py-2 rounded-xl ${
							matchType === "doubles"
								? "bg-purple-600 text-white"
								: "bg-gray-800 text-gray-300"
						}`}
						onClick={() => setMatchType("doubles")}
					>
						Doubles
					</button>
				</div>

				{/* Tournament selector */}
				<div>
					<label className="block text-sm font-medium text-gray-300 mb-1">
						Tournament
					</label>
					<select
						value={tournamentId ?? ""}
						onChange={(e) => setTournamentId(e.target.value)}
						className="w-full p-3 rounded-xl bg-black/60 border border-white/20 text-white"
					>
						{tournaments.map((t) => (
							<option key={t.id} value={t.id}>
								{t.tournament_name}
							</option>
						))}
					</select>
				</div>

				{/* Players */}
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-300">
							Player A1
						</label>
						<select
							value={playerA1}
							onChange={(e) => setPlayerA1(e.target.value)}
							className="w-full p-3 rounded-xl bg-black/60 border border-white/20 text-white"
						>
							<option value="">Select Player</option>
							{players.map((p) => (
								<option key={p.id} value={p.id}>
									{p.player_name}
								</option>
							))}
						</select>
					</div>
					{matchType === "doubles" && (
						<div>
							<label className="block text-sm font-medium text-gray-300">
								Player A2
							</label>
							<select
								value={playerA2}
								onChange={(e) => setPlayerA2(e.target.value)}
								className="w-full p-3 rounded-xl bg-black/60 border border-white/20 text-white"
							>
								<option value="">Select Player</option>
								{players.map((p) => (
									<option key={p.id} value={p.id}>
										{p.player_name}
									</option>
								))}
							</select>
						</div>
					)}
					<div>
						<label className="block text-sm font-medium text-gray-300">
							Player B1
						</label>
						<select
							value={playerB1}
							onChange={(e) => setPlayerB1(e.target.value)}
							className="w-full p-3 rounded-xl bg-black/60 border border-white/20 text-white"
						>
							<option value="">Select Player</option>
							{players.map((p) => (
								<option key={p.id} value={p.id}>
									{p.player_name}
								</option>
							))}
						</select>
					</div>
					{matchType === "doubles" && (
						<div>
							<label className="block text-sm font-medium text-gray-300">
								Player B2
							</label>
							<select
								value={playerB2}
								onChange={(e) => setPlayerB2(e.target.value)}
								className="w-full p-3 rounded-xl bg-black/60 border border-white/20 text-white"
							>
								<option value="">Select Player</option>
								{players.map((p) => (
									<option key={p.id} value={p.id}>
										{p.player_name}
									</option>
								))}
							</select>
						</div>
					)}
				</div>

				{/* Scores */}
				<div className="grid grid-cols-2 gap-4">
					<input
						type="number"
						min={0}
						value={scoreA}
						onChange={(e) => setScoreA(Number(e.target.value))}
						placeholder="Score A"
						className="p-3 rounded-xl bg-black/60 border border-white/20 text-white"
					/>
					<input
						type="number"
						min={0}
						value={scoreB}
						onChange={(e) => setScoreB(Number(e.target.value))}
						placeholder="Score B"
						className="p-3 rounded-xl bg-black/60 border border-white/20 text-white"
					/>
				</div>

				{/* Elo preview */}
				{eloPreview && (
					<div className="border-t border-white/20 pt-4 text-white">
						<p>
							Winner:{" "}
							<strong>
								{eloPreview.winner === "A"
									? "Player A"
									: "Player B"}
							</strong>
						</p>
						<p>
							Player A: {eloPreview.eloChangeA > 0 && "+"}
							{eloPreview.eloChangeA} → {eloPreview.newRatingA}
						</p>
						<p>
							Player B: {eloPreview.eloChangeB > 0 && "+"}
							{eloPreview.eloChangeB} → {eloPreview.newRatingB}
						</p>
					</div>
				)}

				<button
					type="submit"
					disabled={loading || !canSubmit}
					className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-semibold"
				>
					{loading ? "Submitting..." : "Submit Match"}
				</button>
				{!canSubmit && (
					<p className="text-xs text-red-400 mt-1">
						Please wait 5 seconds before submitting another match.
					</p>
				)}
			</form>
		</div>
	);
}
