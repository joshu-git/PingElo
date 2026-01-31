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
	start_date: string;
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
	player_a_id: string | null;
	player_b_id: string | null;
	completed: boolean;
	match_id?: string | null;
};

type BracketRow = BracketRowDB & {
	player_a1?: Player | null;
	player_b1?: Player | null;
};

/* -------------------- COMPONENT -------------------- */

export default function TournamentPage() {
	const { id: tournamentId } = useParams<{ id: string }>();

	const [tournament, setTournament] = useState<Tournament | null>(null);
	const [signups, setSignups] = useState<Player[]>([]);
	const [brackets, setBrackets] = useState<BracketRow[]>([]);
	const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
	const [authUserId, setAuthUserId] = useState<string | null>(null);

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

	/* -------------------- LOAD TOURNAMENT + SIGNUPS + BRACKETS -------------------- */
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

			// Load signups (before tournament starts)
			if (!t.started) {
				const { data: signupRows } = await supabase
					.from("tournament_signups")
					.select("player_id")
					.eq("tournament_id", tournamentId);

				const playerIds = signupRows?.map((r) => r.player_id) ?? [];
				if (playerIds.length) {
					const { data: players } = await supabase
						.from("players")
						.select("id, player_name, account_id")
						.in("id", playerIds);

					setSignups(players ?? []);
				} else {
					setSignups([]);
				}
			} else {
				setSignups([]);
			}

			// Only fetch brackets if tournament started
			if (t.started) {
				const { data: rawBrackets } = await supabase
					.from("tournament_brackets")
					.select("*")
					.eq("tournament_id", tournamentId)
					.order("round", { ascending: true })
					.order("id", { ascending: true });

				const list = rawBrackets ?? [];

				const playerIds = Array.from(
					new Set(
						list
							.flatMap((b) => [b.player_a_id, b.player_b_id])
							.filter(Boolean) as string[]
					)
				);

				let playersMap = new Map<string, Player>();
				if (playerIds.length) {
					const { data: players } = await supabase
						.from("players")
						.select("id, player_name, account_id")
						.in("id", playerIds);

					playersMap = new Map(players?.map((p) => [p.id, p]) ?? []);
				}

				setBrackets(
					list.map((b) => ({
						...b,
						player_a1: b.player_a_id
							? (playersMap.get(b.player_a_id) ?? null)
							: null,
						player_b1: b.player_b_id
							? (playersMap.get(b.player_b_id) ?? null)
							: null,
					}))
				);
			} else {
				setBrackets([]);
			}
		} finally {
			setLoading(false);
		}
	}, [tournamentId]);

	useEffect(() => {
		loadTournament();
	}, [loadTournament]);

	/* -------------------- DERIVED STATE -------------------- */

	if (loading || !tournament) {
		return <div className="p-6 text-gray-400">Loading tournament...</div>;
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

			{/* SIGN-UP BUTTON */}
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

			{/* SIGNUPS BEFORE TOURNAMENT */}
			{!tournament.started && signups.length > 0 && (
				<div className="mt-6">
					<h2 className="text-xl font-semibold mb-2">
						Signed-up Players
					</h2>
					<ul className="space-y-1">
						{signups.map((p) => (
							<li
								key={p.id}
								className="p-2 border border-white/10 rounded"
							>
								{p.player_name}
							</li>
						))}
					</ul>
				</div>
			)}

			{/* BRACKETS */}
			{tournament.started && brackets.length > 0 && (
				<div className="mt-6 space-y-4">
					<h2 className="text-xl font-semibold mb-2">Brackets</h2>
					{brackets.map((b) => (
						<div
							key={b.id}
							className="p-3 border border-white/10 rounded flex justify-between"
						>
							<div>
								<p>{b.player_a1?.player_name ?? "TBD"}</p>
								<p>vs</p>
								<p>{b.player_b1?.player_name ?? "TBD"}</p>
							</div>
							<div>
								{b.completed ? "✔️ Completed" : "⏳ Pending"}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
