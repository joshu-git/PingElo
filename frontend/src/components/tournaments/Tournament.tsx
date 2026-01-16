"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* -------------------- TYPES -------------------- */

type Tournament = {
	id: string;
	tournament_name: string;
	created_by: string;
	match_type: "singles" | "doubles";
	started: boolean;
	completed: boolean;
};

type Player = {
	id: string;
	player_name: string;
};

// raw DB bracket row
type BracketRowDB = {
	id: string;
	round: number;
	bracket_number: number;
	player_a1_id: string | null;
	player_a2_id: string | null;
	player_b1_id: string | null;
	player_b2_id: string | null;
	completed: boolean;
	winner1: string | null;
	winner2: string | null;
};

// enriched bracket row for frontend display
type BracketRow = BracketRowDB & {
	players_a1?: Player | null;
	players_a2?: Player | null;
	players_b1?: Player | null;
	players_b2?: Player | null;
};

/* -------------------- COMPONENT -------------------- */

export default function TournamentPage() {
	const params = useParams();
	const tournamentId = params.id;

	const [tournament, setTournament] = useState<Tournament | null>(null);
	const [signups, setSignups] = useState<Player[]>([]);
	const [brackets, setBrackets] = useState<BracketRow[]>([]);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [starting, setStarting] = useState(false);

	/* -------------------- LOAD USER -------------------- */
	useEffect(() => {
		const fetchUser = async () => {
			const { data } = await supabase.auth.getUser();
			setCurrentUserId(data.user?.id ?? null);
		};
		fetchUser();
	}, []);

	/* -------------------- LOAD TOURNAMENT -------------------- */
	const loadTournament = useCallback(async () => {
		setLoading(true);

		try {
			// fetch tournament
			const { data: t, error: tError } = await supabase
				.from("tournaments")
				.select("*")
				.eq("id", tournamentId)
				.single<Tournament>();

			if (tError || !t) throw tError ?? new Error("Tournament not found");
			setTournament(t);

			// fetch signups
			const { data: signupRows } = await supabase
				.from("tournament_signups")
				.select("player_id")
				.eq("tournament_id", tournamentId);

			const playerIds = signupRows?.map((s) => s.player_id) ?? [];
			if (playerIds.length > 0) {
				const { data: playersData } = await supabase
					.from("players")
					.select("id, player_name")
					.in("id", playerIds);

				setSignups(playersData ?? []);
			} else {
				setSignups([]);
			}

			// fetch raw brackets
			const { data: rawBrackets } = await supabase
				.from("tournament_brackets")
				.select("*")
				.eq("tournament_id", tournamentId)
				.order("round", { ascending: true })
				.order("bracket_number", { ascending: true });

			const bracketsList = rawBrackets ?? [];

			// fetch all unique players referenced in brackets
			const playerIdsInBrackets = Array.from(
				new Set(
					bracketsList
						.flatMap((b) => [
							b.player_a1_id,
							b.player_a2_id,
							b.player_b1_id,
							b.player_b2_id,
						])
						.filter(Boolean) as string[]
				)
			);

			const { data: allPlayers } = await supabase
				.from("players")
				.select("id, player_name")
				.in("id", playerIdsInBrackets);

			const playerMap = new Map(allPlayers?.map((p) => [p.id, p]) ?? []);

			// enrich brackets
			const enrichedBrackets: BracketRow[] = bracketsList.map((b) => ({
				...b,
				players_a1: b.player_a1_id
					? playerMap.get(b.player_a1_id) ?? null
					: null,
				players_a2: b.player_a2_id
					? playerMap.get(b.player_a2_id) ?? null
					: null,
				players_b1: b.player_b1_id
					? playerMap.get(b.player_b1_id) ?? null
					: null,
				players_b2: b.player_b2_id
					? playerMap.get(b.player_b2_id) ?? null
					: null,
			}));

			setBrackets(enrichedBrackets);
		} catch (err) {
			console.error("Error loading tournament:", err);
		} finally {
			setLoading(false);
		}
	}, [tournamentId]);

	useEffect(() => {
		loadTournament();
	}, [loadTournament]);

	/* -------------------- START TOURNAMENT -------------------- */
	const startTournament = async () => {
		if (!tournament || starting) return;

		setStarting(true);
		try {
			const { data: sessionData } = await supabase.auth.getSession();
			const token = sessionData.session?.access_token;
			if (!token) throw new Error("Not signed in");

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/tournaments/generate-brackets`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ tournament_id: tournamentId }),
				}
			);

			if (!res.ok) {
				const errJson = await res.json();
				throw new Error(errJson.error ?? "Failed to start tournament");
			}

			await loadTournament();
		} catch (err: unknown) {
			if (err instanceof Error) alert(err.message);
			else alert("Unknown error");
		} finally {
			setStarting(false);
		}
	};

	/* -------------------- RENDER -------------------- */
	if (loading || !tournament)
		return <div className="p-6">Loading tournament…</div>;

	const canStart =
		currentUserId === tournament.created_by &&
		!tournament.started &&
		signups.length > 1;

	return (
		<div className="max-w-6xl mx-auto p-6 space-y-8">
			{/* HEADER */}
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold">
					{tournament.tournament_name}
				</h1>
				{canStart && (
					<button
						onClick={startTournament}
						disabled={starting}
						className="bg-white text-black px-5 py-2 rounded font-semibold"
					>
						{starting ? "Starting…" : "Start Tournament"}
					</button>
				)}
			</div>

			{/* SIGNUPS */}
			{!tournament.started && signups.length > 0 && (
				<div>
					<h2 className="text-xl font-semibold mb-2">Players</h2>
					<ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
						{signups.map((p) => (
							<li key={p.id} className="bg-zinc-900 p-2 rounded">
								{p.player_name}
							</li>
						))}
					</ul>
				</div>
			)}

			{/* BRACKETS */}
			{tournament.started && brackets.length > 0 && (
				<div className="space-y-8">
					{[...new Set(brackets.map((b) => b.round))].map((round) => (
						<div key={round}>
							<h2 className="text-2xl font-semibold mb-4">
								Round {round}
							</h2>
							<div className="grid md:grid-cols-2 gap-4">
								{brackets
									.filter((b) => b.round === round)
									.map((b) => (
										<div
											key={b.id}
											className="bg-zinc-900 p-4 rounded space-y-2"
										>
											<div>
												{b.players_a1?.player_name}
												{b.players_a2 &&
													` & ${b.players_a2.player_name}`}
											</div>
											<div className="text-center text-zinc-400">
												vs
											</div>
											<div>
												{b.players_b1?.player_name ??
													"BYE"}
												{b.players_b2 &&
													` & ${b.players_b2.player_name}`}
											</div>
											{b.completed && (
												<div className="text-green-400 text-sm mt-2">
													Completed
												</div>
											)}
										</div>
									))}
							</div>
						</div>
					))}
				</div>
			)}

			{/* COMPLETION MESSAGE */}
			{tournament.completed && (
				<div className="text-center text-2xl font-bold text-green-400">
					Tournament Complete 🏆
				</div>
			)}
		</div>
	);
}
