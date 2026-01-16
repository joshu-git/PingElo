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
	account_id: string | null;
};

type BracketRowDB = {
	id: string;
	round: number;
	bracket_number: number;
	player_a1_id: string | null;
	player_a2_id: string | null;
	player_b1_id: string | null;
	player_b2_id: string | null;
	completed: boolean;
};

type BracketRow = BracketRowDB & {
	players_a1?: Player | null;
	players_a2?: Player | null;
	players_b1?: Player | null;
	players_b2?: Player | null;
};

/* -------------------- COMPONENT -------------------- */

export default function TournamentPage() {
	const params = useParams();
	const tournamentId = params.id as string;

	const [tournament, setTournament] = useState<Tournament | null>(null);
	const [signups, setSignups] = useState<Player[]>([]);
	const [brackets, setBrackets] = useState<BracketRow[]>([]);

	const [authUserId, setAuthUserId] = useState<string | null>(null);
	const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

	const [loading, setLoading] = useState(true);
	const [starting, setStarting] = useState(false);
	const [signingUp, setSigningUp] = useState(false);

	/* -------------------- LOAD AUTH + PLAYER -------------------- */
	useEffect(() => {
		const loadUser = async () => {
			const { data } = await supabase.auth.getUser();
			const uid = data.user?.id ?? null;
			setAuthUserId(uid);

			if (!uid) return;

			const { data: player } = await supabase
				.from("players")
				.select("id, player_name, account_id")
				.eq("account_id", uid)
				.single();

			setCurrentPlayer(player ?? null);
		};

		loadUser();
	}, []);

	/* -------------------- LOAD TOURNAMENT -------------------- */
	const loadTournament = useCallback(async () => {
		setLoading(true);
		try {
			const { data: t } = await supabase
				.from("tournaments")
				.select("*")
				.eq("id", tournamentId)
				.single();

			if (!t) throw new Error("Tournament not found");
			setTournament(t);

			/* ---- SIGNUPS ---- */
			if (!t.started) {
				const { data: signupRows } = await supabase
					.from("tournament_signups")
					.select("player_id")
					.eq("tournament_id", tournamentId);

				const playerIds = signupRows?.map((s) => s.player_id) ?? [];

				if (playerIds.length > 0) {
					const { data: players } = await supabase
						.from("players")
						.select("id, player_name, account_id")
						.in("id", playerIds);

					setSignups(players ?? []);
				} else {
					setSignups([]);
				}
			}

			/* ---- BRACKETS ---- */
			const { data: rawBrackets } = await supabase
				.from("tournament_brackets")
				.select("*")
				.eq("tournament_id", tournamentId)
				.order("round")
				.order("bracket_number");

			const bracketsList = rawBrackets ?? [];

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

			if (playerIdsInBrackets.length > 0) {
				const { data: allPlayers } = await supabase
					.from("players")
					.select("id, player_name")
					.in("id", playerIdsInBrackets);

				const map = new Map(allPlayers?.map((p) => [p.id, p]) ?? []);

				setBrackets(
					bracketsList.map((b) => ({
						...b,
						players_a1: b.player_a1_id
							? map.get(b.player_a1_id) ?? null
							: null,
						players_a2: b.player_a2_id
							? map.get(b.player_a2_id) ?? null
							: null,
						players_b1: b.player_b1_id
							? map.get(b.player_b1_id) ?? null
							: null,
						players_b2: b.player_b2_id
							? map.get(b.player_b2_id) ?? null
							: null,
					}))
				);
			} else {
				setBrackets([]);
			}
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [tournamentId]);

	useEffect(() => {
		loadTournament();
	}, [loadTournament]);

	/* -------------------- DERIVED STATE -------------------- */

	if (loading || !tournament) {
		return <div className="p-6">Loading tournament…</div>;
	}

	const isOwner = authUserId === tournament.created_by;

	const isSignedUp =
		!!currentPlayer && signups.some((p) => p.id === currentPlayer.id);

	const signupDisabled =
		!currentPlayer || tournament.started || isSignedUp || signingUp;

	const canStart = isOwner && !tournament.started && signups.length > 1;

	/* -------------------- ACTIONS -------------------- */

	const signup = async () => {
		if (!currentPlayer || signupDisabled) return;

		setSigningUp(true);
		const { error } = await supabase.from("tournament_signups").insert({
			tournament_id: tournament.id,
			player_id: currentPlayer.id,
		});

		if (!error) await loadTournament();
		else alert(error.message);

		setSigningUp(false);
	};

	const startTournament = async () => {
		if (!canStart || starting) return;

		setStarting(true);

		const { data } = await supabase.auth.getSession();
		const token = data.session?.access_token;

		const res = await fetch(
			`${process.env.NEXT_PUBLIC_BACKEND_URL}/tournaments/generate-brackets`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ tournament_id: tournament.id }),
			}
		);

		if (!res.ok) {
			const e = await res.json();
			alert(e.error ?? "Failed to start");
		} else {
			await loadTournament();
		}

		setStarting(false);
	};

	/* -------------------- RENDER -------------------- */

	return (
		<div className="max-w-6xl mx-auto p-6 space-y-8">
			<div className="flex justify-between items-center">
				<h1 className="text-3xl font-bold">
					{tournament.tournament_name}
				</h1>

				{isOwner && (
					<button
						onClick={startTournament}
						disabled={!canStart || starting}
						className={`px-5 py-2 rounded font-semibold
							${
								canStart
									? "bg-white text-black"
									: "bg-zinc-700 text-zinc-400 cursor-not-allowed"
							}`}
					>
						{starting ? "Starting…" : "Start Tournament"}
					</button>
				)}
			</div>

			{/* SIGN UP */}
			<button
				onClick={signup}
				disabled={signupDisabled}
				className={`px-5 py-2 rounded font-semibold
					${
						signupDisabled
							? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
							: "bg-green-500 text-black"
					}`}
			>
				{isSignedUp ? "Signed Up" : "Sign Up"}
			</button>

			{/* PLAYERS */}
			{signups.length > 0 && (
				<ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
					{signups.map((p) => (
						<li key={p.id} className="bg-zinc-900 p-2 rounded">
							{p.player_name}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
