"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/* -------------------- RANK HELPERS -------------------- */

const RANKS = [
	{ min: 1600, label: "Super Grand Master" },
	{ min: 1400, label: "Grand Master" },
	{ min: 1200, label: "Master" },
	{ min: 1000, label: "Competitor" },
	{ min: 800, label: "Advanced" },
	{ min: 600, label: "Beginner" },
	{ min: 0, label: "Bikini Bottom" },
];

const getRankLabel = (elo?: number) =>
	RANKS.find((r) => (elo ?? 0) >= r.min)?.label ?? "Unranked";

/* -------------------- TYPES -------------------- */

type Tournament = {
	id: string;
	tournament_name: string;
	tournament_description?: string | null;
	created_by: string;
	started: boolean;
	completed: boolean;
	start_date: string;
};

type Player = {
	id: string;
	player_name: string;
	account_id: string | null;
	group_id?: string | null;
	singles_elo?: number;
};

type Group = {
	id: string;
	group_name: string;
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

type MatchRow = {
	id: string;
	score_a: number;
	score_b: number;
};

/* -------------------- COMPONENT -------------------- */

export default function TournamentPage() {
	const { id: tournamentId } = useParams<{ id: string }>();
	const router = useRouter();

	const [tournament, setTournament] = useState<Tournament | null>(null);
	const [signups, setSignups] = useState<Player[]>([]);
	const [brackets, setBrackets] = useState<BracketRow[]>([]);
	const [matchesMap, setMatchesMap] = useState<Map<string, MatchRow>>(
		new Map()
	);

	const [groups, setGroups] = useState<Group[]>([]);
	const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
	const [authUserId, setAuthUserId] = useState<string | null>(null);

	const [loadingTournamentData, setLoadingTournamentData] = useState(true);
	const [signingUp, setSigningUp] = useState(false);
	const [starting, setStarting] = useState(false);

	/* -------------------- LOAD GROUPS -------------------- */
	useEffect(() => {
		supabase
			.from("groups")
			.select("id, group_name")
			.then(({ data }) => data && setGroups(data));
	}, []);

	const groupMap = useMemo(
		() => new Map(groups.map((g) => [g.id, g.group_name])),
		[groups]
	);

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

	/* -------------------- BASIC TOURNAMENT LOAD (name + desc + status) -------------------- */
	useEffect(() => {
		const loadBasicTournament = async () => {
			const { data: t } = await supabase
				.from("tournaments")
				.select(
					"id, tournament_name, tournament_description, created_by, started, completed, start_date"
				)
				.eq("id", tournamentId)
				.single();

			if (!t) return;
			setTournament(t);
		};

		loadBasicTournament();
	}, [tournamentId]);

	/* -------------------- FULL TOURNAMENT LOAD (signups, brackets, matches) -------------------- */
	const loadTournamentData = useCallback(async () => {
		if (!tournament) return;

		setLoadingTournamentData(true);
		try {
			if (!tournament.started) {
				const { data: signupRows } = await supabase
					.from("tournament_signups")
					.select("player_id")
					.eq("tournament_id", tournamentId);

				const playerIds = signupRows?.map((r) => r.player_id) ?? [];

				if (playerIds.length) {
					const { data: players } = await supabase
						.from("players")
						.select(
							"id, player_name, account_id, group_id, singles_elo"
						)
						.in("id", playerIds);

					setSignups(players ?? []);
				} else {
					setSignups([]);
				}
			} else {
				setSignups([]);
			}

			if (tournament.started) {
				const { data: rawBrackets } = await supabase
					.from("tournament_brackets")
					.select("*")
					.eq("tournament_id", tournamentId)
					.order("round", { ascending: false })
					.order("id", { ascending: true });

				const list = rawBrackets ?? [];

				const playerIds = Array.from(
					new Set(
						list
							.flatMap((b) => [b.player_a_id, b.player_b_id])
							.filter(Boolean) as string[]
					)
				);

				const matchIds = Array.from(
					new Set(list.map((b) => b.match_id).filter(Boolean))
				) as string[];

				let playersMap = new Map<string, Player>();
				if (playerIds.length) {
					const { data: players } = await supabase
						.from("players")
						.select("id, player_name, account_id")
						.in("id", playerIds);

					playersMap = new Map(players?.map((p) => [p.id, p]) ?? []);
				}

				if (matchIds.length) {
					const { data: matches } = await supabase
						.from("matches")
						.select("id, score_a, score_b")
						.in("id", matchIds);

					setMatchesMap(
						new Map(matches?.map((m) => [m.id, m]) ?? [])
					);
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
			setLoadingTournamentData(false);
		}
	}, [tournament, tournamentId]);

	useEffect(() => {
		loadTournamentData();
	}, [loadTournamentData]);

	/* -------------------- DERIVED -------------------- */

	const bracketsByRound = useMemo(() => {
		const map = new Map<number, BracketRow[]>();
		for (const b of brackets) {
			if (!map.has(b.round)) map.set(b.round, []);
			map.get(b.round)!.push(b);
		}
		return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
	}, [brackets]);

	/* -------------------- ACTIONS -------------------- */

	const signup = async () => {
		if (
			!currentPlayer ||
			!tournament ||
			!(!currentPlayer || tournament.started)
		)
			return;
		setSigningUp(true);

		const { data } = await supabase.auth.getSession();
		const token = data.session?.access_token;

		await fetch(
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

		await loadTournamentData();
		setSigningUp(false);
	};

	const startTournament = async () => {
		if (!tournament || starting) return;
		setStarting(true);

		const { data } = await supabase.auth.getSession();
		const token = data.session?.access_token;

		await fetch(
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

		await loadTournamentData();
		setStarting(false);
	};

	/* -------------------- RENDER -------------------- */

	if (!tournament) {
		return (
			<div className="p-6 text-center text-text-muted">
				Loading tournament…
			</div>
		);
	}

	const isOwner = authUserId === tournament.created_by;
	const isSignedUp =
		!!currentPlayer && signups.some((p) => p.id === currentPlayer.id);
	const signupDisabled =
		!currentPlayer || tournament.started || isSignedUp || signingUp;
	const canStart = isOwner && !tournament.started && signups.length > 1;

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">
					{tournament.tournament_name}
				</h1>
				<p className="text-text-muted">
					{tournament.tournament_description ?? "No Description"}
				</p>
			</section>

			<div className="flex justify-between flex-wrap gap-4 mb-2">
				{!tournament.started && (
					<button
						onClick={signup}
						disabled={signupDisabled}
						className="px-4 py-2 rounded-lg disabled:opacity-50"
					>
						{isSignedUp ? "Signed Up" : "Sign Up"}
					</button>
				)}
				{!tournament.started && (
					<button
						onClick={startTournament}
						disabled={!canStart || starting}
						className="px-4 py-2 rounded-lg disabled:opacity-50"
					>
						{starting ? "Starting…" : "Start Tournament"}
					</button>
				)}
			</div>

			{loadingTournamentData && (
				<p className="text-center text-text-muted py-4">Loading…</p>
			)}

			{/* SIGNUPS */}
			{!tournament.started && signups.length > 0 && (
				<section className="space-y-2 pt-4">
					<h2 className="text-xl font-semibold text-center">
						Signed Up Players
					</h2>

					{signups.map((p) => (
						<div
							key={p.id}
							className="flex items-center justify-between bg-card p-4 rounded-xl hover-card"
						>
							<div>
								<Link
									href={`/profile/${p.player_name}`}
									className="font-semibold hover:underline"
								>
									{p.player_name}
								</Link>
								<p className="text-sm text-text-muted">
									{groupMap.get(p.group_id ?? "") ??
										"No Group"}{" "}
									· {getRankLabel(p.singles_elo)}
								</p>
							</div>
							<div className="text-2xl font-bold">
								{p.singles_elo ?? "-"}
							</div>
						</div>
					))}
				</section>
			)}

			{/* BRACKETS */}
			{tournament.started &&
				bracketsByRound.map(([round, list]) => (
					<section key={round} className="space-y-3">
						<h2 className="text-lg font-semibold text-center">
							Round {round}
						</h2>

						{list.map((b) => {
							const match = b.match_id
								? matchesMap.get(b.match_id)
								: null;
							return (
								<div
									key={b.id}
									onClick={() =>
										b.match_id &&
										router.push(`/matches/${b.match_id}`)
									}
									className="bg-card p-4 rounded-xl hover-card cursor-pointer"
								>
									<div className="flex justify-between">
										<div className="space-y-1">
											<p className="font-semibold">
												{b.player_a1?.player_name ??
													"BYE"}
											</p>
											<p className="text-text-muted">
												vs
											</p>
											<p className="font-semibold">
												{b.player_b1?.player_name ??
													"BYE"}
											</p>
										</div>

										{match && (
											<div className="text-right shrink-0">
												<div className="text-lg font-bold">
													{match.score_a} -{" "}
													{match.score_b}
												</div>
												<div className="text-sm text-text-muted">
													Completed
												</div>
											</div>
										)}
									</div>
								</div>
							);
						})}
					</section>
				))}
		</main>
	);
}
