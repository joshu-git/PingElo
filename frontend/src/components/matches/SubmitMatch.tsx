"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

//Elo logic
const BASE_K = 50;
const TOURNAMENT_BASE_K = 100;
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
	if (gamePoints <= 0) return 0;

	const diff = Math.abs(scoreA - scoreB) / gamePoints;
	const length = gamePoints / IDEAL_POINTS;

	return (isTournament ? TOURNAMENT_BASE_K : BASE_K) * diff * length;
}

function calculateElo(
	rA: number,
	rB: number,
	scoreA: number,
	scoreB: number,
	gamePoints: number,
	isTournament: boolean
) {
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

//Types
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

type Bracket = {
	id: string;
	match_id: string | null;
	completed: boolean;
	player_a_id: string;
	player_b_id: string;
};

export default function SubmitMatch() {
	const [players, setPlayers] = useState<Player[]>([]);
	const [tournaments, setTournaments] = useState<Tournament[]>([]);
	const [tournamentBrackets, setTournamentBrackets] = useState<Bracket[]>([]);
	const [isDoubles, setIsDoubles] = useState(false);

	const [a1, setA1] = useState("");
	const [a2, setA2] = useState("");
	const [b1, setB1] = useState("");
	const [b2, setB2] = useState("");

	const [scoreA, setScoreA] = useState(0);
	const [scoreB, setScoreB] = useState(0);

	const [tournamentId, setTournamentId] = useState<string | null>(null);
	const [userGroupId, setUserGroupId] = useState<string | null>(null);

	const [loading, setLoading] = useState(false);
	const [canSubmit, setCanSubmit] = useState(true);

	const fieldClass =
		"w-full rounded-lg px-4 py-3 bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-border";

	//Load user + tournaments
	useEffect(() => {
		async function loadUserContext() {
			const { data } = await supabase.auth.getSession();
			if (!data.session) return;

			const { data: player } = await supabase
				.from("pe_players")
				.select("group_id")
				.eq("account_id", data.session.user.id)
				.single();

			setUserGroupId(player?.group_id ?? null);
		}

		loadUserContext();

		supabase
			.from("pe_tournaments")
			.select("id, tournament_name")
			.eq("started", true)
			.eq("completed", false)
			.then(({ data }) => data && setTournaments(data));
	}, []);

	//Load players
	useEffect(() => {
		async function loadPlayers() {
			if (!userGroupId && !tournamentId) {
				setPlayers([]);
				setTournamentBrackets([]);
				return;
			}

			//Tournament singles
			if (tournamentId && !isDoubles) {
				const { data } = await supabase
					.from("pe_tournament_brackets")
					.select("id, match_id, completed, player_a_id, player_b_id")
					.eq("tournament_id", tournamentId)
					.eq("completed", false);

				if (!data) {
					setPlayers([]);
					setTournamentBrackets([]);
					return;
				}

				setTournamentBrackets(data as Bracket[]);

				const ids = Array.from(
					new Set(data.flatMap((b) => [b.player_a_id, b.player_b_id]))
				);

				const { data: playersData } = await supabase
					.from("pe_players")
					.select("id, player_name, singles_elo, doubles_elo")
					.in("id", ids);

				setPlayers(playersData ?? []);
				return;
			}

			//Group players
			if (userGroupId) {
				const { data } = await supabase
					.from("pe_players")
					.select("*")
					.eq("group_id", userGroupId);

				setPlayers(data ?? []);
				setTournamentBrackets([]);
			}
		}

		loadPlayers();
	}, [userGroupId, tournamentId, isDoubles]);

	//Disable tournaments for doubles + reset form
	useEffect(() => {
		setTournamentId((prev) => (isDoubles ? null : prev));
		setA1("");
		setA2("");
		setB1("");
		setB2("");
		setScoreA(0);
		setScoreB(0);
	}, [isDoubles]);

	//Helpers
	function availablePlayers(current: string) {
		const selected = new Set([a1, a2, b1, b2].filter(Boolean));
		selected.delete(current);
		return players.filter((p) => !selected.has(p.id));
	}

	//Frontend tournament validation
	function validateTournamentMatch(
		brackets: Bracket[],
		playerAId: string,
		playerBId: string
	): string | null {
		const match = brackets.find(
			(b) =>
				!b.completed &&
				!b.match_id &&
				((b.player_a_id === playerAId && b.player_b_id === playerBId) ||
					(b.player_a_id === playerBId &&
						b.player_b_id === playerAId))
		);
		return match?.id ?? null;
	}

	//Validation
	const validationErrors = useMemo(() => {
		const errors: string[] = [];

		//Score validation
		if (scoreA < 0 || scoreB < 0) errors.push("Scores cannot be negative");
		if (scoreA > 21 || scoreB > 21) errors.push("Scores cannot be over 21");
		if (Math.abs(scoreA - scoreB) < 2)
			errors.push("Match must be won by at least 2 points");

		//Player validation
		if (!isDoubles && (!a1 || !b1)) errors.push("Missing player IDs");
		if (isDoubles && (!a1 || !a2 || !b1 || !b2))
			errors.push("Missing player IDs");

		const selected = [a1, a2, b1, b2].filter(Boolean);
		if (new Set(selected).size !== selected.length)
			errors.push("Players must be unique");

		if (tournamentId && !isDoubles) {
			if (!validateTournamentMatch(tournamentBrackets, a1, b1)) {
				errors.push("This match is not allowed in the tournament");
			}
		}

		return errors;
	}, [
		a1,
		a2,
		b1,
		b2,
		scoreA,
		scoreB,
		isDoubles,
		tournamentId,
		tournamentBrackets,
	]);

	const formValid = validationErrors.length === 0;

	//Elo preview
	const eloPreview = useMemo(() => {
		if (!formValid) return null;

		const gamePoints = Math.max(scoreA, scoreB);
		if (gamePoints <= 0) return null;

		const pA1 = players.find((p) => p.id === a1);
		const pB1 = players.find((p) => p.id === b1);
		if (!pA1 || !pB1) return null;

		if (!isDoubles) {
			return calculateElo(
				pA1.singles_elo,
				pB1.singles_elo,
				scoreA,
				scoreB,
				gamePoints,
				Boolean(tournamentId)
			);
		}

		const pA2 = players.find((p) => p.id === a2);
		const pB2 = players.find((p) => p.id === b2);
		if (!pA2 || !pB2) return null;

		const teamA = (pA1.doubles_elo + pA2.doubles_elo) / 2;
		const teamB = (pB1.doubles_elo + pB2.doubles_elo) / 2;

		//Doubles never have tournaments
		return calculateElo(teamA, teamB, scoreA, scoreB, gamePoints, false);
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

	//Submit
	async function submitMatch(e: React.FormEvent) {
		e.preventDefault();
		if (!formValid || loading || !canSubmit) return;

		setLoading(true);
		setCanSubmit(false);
		setTimeout(() => setCanSubmit(true), 5000);

		try {
			const { data } = await supabase.auth.getSession();
			if (!data.session) throw new Error("Not signed in");

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
						Authorization: `Bearer ${data.session.access_token}`,
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
			location.reload();
		}
	}

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* HERO */}
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">
					Submit Match
				</h1>
				<p className="text-text-muted max-w-2xl mx-auto">
					Record a match and preview Elo changes before submitting.
				</p>
			</section>

			{/* CONTROLS */}
			<div className="flex flex-wrap justify-center gap-2">
				<button
					type="button"
					onClick={() => setIsDoubles(false)}
					className={`px-4 py-2 rounded-lg ${
						!isDoubles ? "font-semibold underline" : ""
					}`}
				>
					Singles
				</button>
				<button
					type="button"
					onClick={() => setIsDoubles(true)}
					className={`px-4 py-2 rounded-lg ${
						isDoubles ? "font-semibold underline" : ""
					}`}
				>
					Doubles
				</button>
				<Link href="/matches">
					<button className="px-4 py-2 rounded-lg">Matches</button>
				</Link>
			</div>

			<form onSubmit={submitMatch} className="space-y-8">
				{/* Tournament */}
				<select
					className={fieldClass}
					value={tournamentId ?? ""}
					onChange={(e) => setTournamentId(e.target.value || null)}
					disabled={isDoubles}
				>
					<option value="">Casual Match</option>
					{tournaments.map((t) => (
						<option key={t.id} value={t.id}>
							{t.tournament_name}
						</option>
					))}
				</select>

				{/* Teams */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					<div className="space-y-2">
						<label className="text-sm text-text-muted font-medium">
							Team A
						</label>
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

					<div className="space-y-2">
						<label className="text-sm text-text-muted font-medium">
							Team B
						</label>
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

				<button
					type="submit"
					disabled={!formValid || loading || !canSubmit}
					className="w-full px-4 py-3 rounded-lg font-semibold"
				>
					{loading ? "Submitting…" : "Submit Match"}
				</button>

				{!userGroupId && (
					<p className="text-xs text-center text-text-muted">
						You need to sign into submit a match
					</p>
				)}

				{userGroupId &&
					validationErrors.map((err) => (
						<p
							key={err}
							className="text-xs text-center text-text-muted"
						>
							{err}
						</p>
					))}

				{!canSubmit && (
					<p className="text-xs text-center text-text-muted">
						Please wait 5 seconds before submitting another match.
					</p>
				)}
			</form>
		</main>
	);
}
