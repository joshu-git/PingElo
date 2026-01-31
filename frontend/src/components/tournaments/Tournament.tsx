"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* -------------------- TYPES -------------------- */

type Tournament = {
	id: string;
	tournament_name: string;
	created_by: string;
	started: boolean;
	completed: boolean;
	start_date: string | null;
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
	player_b1_id: string | null;
	completed: boolean;
	match_id?: string | null;
};

type BracketRow = BracketRowDB & {
	player_a?: Player | null;
	player_b?: Player | null;
};

/* -------------------- COMPONENT -------------------- */

export default function TournamentPage() {
	const { id: tournamentId } = useParams<{ id: string }>();

	const [tournament, setTournament] = useState<Tournament | null>(null);
	const [signups, setSignups] = useState<Player[]>([]);
	const [brackets, setBrackets] = useState<BracketRow[]>([]);
	const [authUserId, setAuthUserId] = useState<string | null>(null);
	const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
	const [loading, setLoading] = useState(true);
	const [signingUp, setSigningUp] = useState(false);
	const [starting, setStarting] = useState(false);

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

	/* -------------------- LOAD TOURNAMENT, SIGNUPS & BRACKETS -------------------- */
	const loadTournament = useCallback(async () => {
		setLoading(true);
		try {
			// Tournament info
			const { data: t } = await supabase
				.from("tournaments")
				.select("*")
				.eq("id", tournamentId)
				.single();
			if (!t) throw new Error("Tournament not found");
			setTournament(t);

			// Signups (only if tournament hasn't started)
			if (!t.started) {
				const { data: rows } = await supabase
					.from("tournament_signups")
					.select("player_id")
					.eq("tournament_id", tournamentId);

				const ids = rows?.map((r) => r.player_id) ?? [];

				if (ids.length) {
					const { data: players } = await supabase
						.from("players")
						.select("id, player_name, account_id")
						.in("id", ids);

					setSignups(players ?? []);
				} else {
					setSignups([]);
				}
			}

			// Brackets (only for started tournaments)
			const { data: rawBrackets } = await supabase
				.from("tournament_brackets")
				.select("*")
				.eq("tournament_id", tournamentId)
				.order("round")
				.order("bracket_number");

			const list = rawBrackets ?? [];

			// Get all player IDs in brackets
			const playerIds = Array.from(
				new Set(
					list
						.flatMap((b) => [b.player_a1_id, b.player_b1_id])
						.filter(Boolean) as string[]
				)
			);

			const playerMap = new Map<string, Player>();
			if (playerIds.length) {
				const { data: players } = await supabase
					.from("players")
					.select("id, player_name, account_id")
					.in("id", playerIds);
				(players ?? []).forEach((p) => playerMap.set(p.id, p));
			}

			// Map players into bracket rows
			setBrackets(
				list.map((b) => ({
					...b,
					player_a: b.player_a1_id
						? (playerMap.get(b.player_a1_id) ?? null)
						: null,
					player_b: b.player_b1_id
						? (playerMap.get(b.player_b1_id) ?? null)
						: null,
				}))
			);
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

		const { data } = await supabase.auth.getSession();
		const token = data.session?.access_token;

		const res = await fetch(
			`${process.env.NEXT_PUBLIC_BACKEND_URL}/tournaments/signup`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					tournament_id: tournament.id,
					player_id: currentPlayer.id,
				}),
			}
		);

		if (!res.ok) {
			const e = await res.json();
			alert(e.error ?? "Signup failed");
		} else {
			await loadTournament();
		}

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

				{!tournament.started && (
					<button
						onClick={startTournament}
						disabled={!canStart || starting}
						className={`px-5 py-2 rounded font-semibold ${
							canStart
								? "bg-white text-black"
								: "bg-zinc-700 text-zinc-400 cursor-not-allowed"
						}`}
					>
						{starting ? "Starting…" : "Start Tournament"}
					</button>
				)}
			</div>

			{/* SIGNUP */}
			{!tournament.started && (
				<button
					onClick={signup}
					disabled={signupDisabled}
					className={`px-5 py-2 rounded font-semibold ${
						signupDisabled
							? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
							: "bg-green-500 text-black"
					}`}
				>
					{isSignedUp ? "Signed Up" : "Sign Up"}
				</button>
			)}

			{/* SIGNUPS LIST */}
			{!tournament.started && (
				<div className="mt-6">
					<h2 className="text-xl font-semibold mb-2">Signups</h2>
					<ul className="list-disc list-inside">
						{signups.map((p) => (
							<li key={p.id}>{p.player_name}</li>
						))}
					</ul>
				</div>
			)}

			{/* BRACKETS */}
			{tournament.started && (
				<div className="mt-6 space-y-6">
					<h2 className="text-xl font-semibold mb-2">Brackets</h2>
					{brackets.length === 0 && <p>No brackets yet</p>}
					{brackets.map((b) => (
						<div
							key={b.id}
							className="border border-white/10 rounded p-3 flex justify-between items-center"
						>
							<div>
								<p className="text-sm text-gray-400">
									Round {b.round} · Bracket {b.bracket_number}
								</p>
								<p>
									<b>{b.player_a?.player_name ?? "TBD"}</b> vs{" "}
									<b>{b.player_b?.player_name ?? "TBD"}</b>
								</p>
								<p className="text-xs text-gray-500">
									{b.completed ? "Completed" : "Pending"}
								</p>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
