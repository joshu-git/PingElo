"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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

const getRankLabel = (elo?: number, matches?: number) => {
	if ((matches ?? 0) < 5) return "Unranked";
	return RANKS.find((r) => (elo ?? 0) >= r.min)?.label ?? "Unranked";
};

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
	created_at?: string;
};

/* -------------------- COMPONENT -------------------- */
export default function TournamentPage() {
	const { id: tournamentId } = useParams<{ id: string }>();
	const router = useRouter();

	// Basic tournament info (header/buttons)
	const [tournament, setTournament] = useState<Tournament | null>(null);

	// Full data
	const [signups, setSignups] = useState<Player[]>([]);
	const [brackets, setBrackets] = useState<BracketRow[]>([]);
	const [matchesMap, setMatchesMap] = useState<Map<string, MatchRow>>(
		new Map()
	);
	const [matchCounts, setMatchCounts] = useState<Map<string, number>>(
		new Map()
	);

	// Groups / auth
	const [groups, setGroups] = useState<Group[]>([]);
	const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
	const [authUserId, setAuthUserId] = useState<string | null>(null);

	// Loading states
	const [loadingTournamentData, setLoadingTournamentData] = useState(false);
	const [signingUp, setSigningUp] = useState(false);
	const [starting, setStarting] = useState(false);

	/* -------------------- LOAD GROUPS -------------------- */
	useEffect(() => {
		supabase
			.from("pe_groups")
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
				.from("pe_players")
				.select("id, player_name, account_id")
				.eq("account_id", uid)
				.single();

			setCurrentPlayer(player ?? null);
		};
		loadUser();
	}, []);

	/* -------------------- LOAD BASIC TOURNAMENT -------------------- */
	useEffect(() => {
		const loadBasicTournament = async () => {
			const { data } = await supabase
				.from("pe_tournaments")
				.select(
					"id, tournament_name, tournament_description, created_by, started, completed, start_date"
				)
				.eq("id", tournamentId)
				.single();

			if (data) setTournament(data);
		};
		loadBasicTournament();
	}, [tournamentId]);

	/* -------------------- LOAD FULL TOURNAMENT DATA -------------------- */
	const matchCountsCache = useRef<Map<string, number>>(new Map());

	const loadTournamentData = useCallback(async () => {
		if (!tournament) return;
		setLoadingTournamentData(true);

		try {
			// -------------------- SIGNUPS --------------------
			if (!tournament.started) {
				const { data: signupRows } = await supabase
					.from("pe_tournament_signups")
					.select("player_id")
					.eq("tournament_id", tournament.id);

				const playerIds = signupRows?.map((r) => r.player_id) ?? [];

				if (playerIds.length) {
					const { data: players } = await supabase
						.from("pe_players")
						.select(
							"id, player_name, account_id, group_id, singles_elo"
						)
						.in("id", playerIds);

					setSignups(players ?? []);

					// Fetch match counts efficiently
					const countsMap = new Map<string, number>();
					await Promise.all(
						(players ?? []).map(async (p) => {
							if (matchCountsCache.current.has(p.id)) {
								countsMap.set(
									p.id,
									matchCountsCache.current.get(p.id)!
								);
							} else {
								const { count } = await supabase
									.from("pe_matches")
									.select("*", { count: "exact", head: true })
									.or(
										`player_a1_id.eq.${p.id},player_b1_id.eq.${p.id}`
									)
									.eq("match_type", "singles");
								countsMap.set(p.id, count ?? 0);
								matchCountsCache.current.set(p.id, count ?? 0);
							}
						})
					);
					setMatchCounts(countsMap);
				} else {
					setSignups([]);
				}
			} else {
				setSignups([]);
			}

			// -------------------- BRACKETS --------------------
			if (tournament.started) {
				const { data: rawBrackets } = await supabase
					.from("pe_tournament_brackets")
					.select("*")
					.eq("tournament_id", tournament.id)
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
						.from("pe_players")
						.select("id, player_name, account_id, singles_elo")
						.in("id", playerIds);

					playersMap = new Map(players?.map((p) => [p.id, p]) ?? []);
				}

				if (matchIds.length) {
					const { data: matches } = await supabase
						.from("pe_matches")
						.select("id, score_a, score_b, created_at")
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
	}, [tournament]);

	useEffect(() => {
		if (tournament) loadTournamentData();
	}, [tournament, loadTournamentData]);

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
		if (!currentPlayer || !tournament || signupDisabled) return;
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

		location.reload();
	};

	const signupDisabled = !currentPlayer || tournament?.started || signingUp;
	const isOwner = authUserId === tournament?.created_by;
	const isSignedUp =
		!!currentPlayer && signups.some((p) => p.id === currentPlayer?.id);
	const canStart = isOwner && !tournament?.started && signups.length > 4;

	/* -------------------- RENDER -------------------- */
	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			{/* Header */}
			{tournament && (
				<section className="text-center space-y-4">
					<h1 className="text-4xl md:text-5xl font-extrabold">
						{tournament.tournament_name}
					</h1>
					<p className="text-text-muted">
						{tournament.tournament_description ?? "No Description"}
					</p>
				</section>
			)}

			{/* Buttons */}
			{tournament && !tournament.started && (
				<div className="flex justify-between flex-wrap gap-4 mb-2">
					{/* Sign Up button */}
					<button
						onClick={signup}
						disabled={isSignedUp || !currentPlayer || signingUp}
						className="px-4 py-2 rounded-lg disabled:opacity-50"
					>
						{isSignedUp ? "Signed Up" : "Sign Up"}
					</button>

					{/* Start Tournament button */}
					<button
						onClick={startTournament}
						disabled={!isOwner || !canStart || starting}
						className="px-4 py-2 rounded-lg disabled:opacity-50"
					>
						{isOwner
							? starting
								? "Starting…"
								: "Start Tournament"
							: "Start Tournament"}
					</button>
				</div>
			)}

			{/* Loading */}
			{loadingTournamentData && (
				<p className="text-center text-text-muted py-4">Loading…</p>
			)}

			{/* SIGNUPS */}
			{!tournament?.started && signups.length > 0 && (
				<section className="space-y-2 pt-4">
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
									·{" "}
									{getRankLabel(
										p.singles_elo,
										matchCounts.get(p.id)
									)}
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
			{tournament?.started &&
				bracketsByRound.map(([round, list]) => {
					let roundLabel = `Round ${round}`;
					if (list.length === 1) roundLabel = "Finals";
					if (list.length === 2) roundLabel = "Semi-Finals";

					return (
						<section key={round} className="space-y-3">
							<h2 className="text-lg font-semibold text-center">
								{roundLabel}
							</h2>

							{list.map((b) => {
								const match = b.match_id
									? matchesMap.get(b.match_id)
									: null;

								const teamA: {
									id?: string;
									name: string;
									elo?: number;
								}[] = b.player_a1
									? [
											{
												id: b.player_a1.id,
												name: b.player_a1.player_name,
												elo: b.player_a1.singles_elo,
											},
										]
									: b.player_b1
										? [{ name: "BYE" }]
										: [{ name: "BYE" }];

								const teamB: {
									id?: string;
									name: string;
									elo?: number;
								}[] = b.player_b1
									? [
											{
												id: b.player_b1.id,
												name: b.player_b1.player_name,
												elo: b.player_b1.singles_elo,
											},
										]
									: b.player_a1
										? [{ name: "BYE" }]
										: [{ name: "BYE" }];

								const teamAWon = match
									? match.score_a > match.score_b
									: false;

								return (
									<div
										key={b.id}
										onClick={() =>
											b.match_id &&
											router.push(
												`/matches/${b.match_id}`
											)
										}
										className="bg-card p-4 rounded-xl hover-card cursor-pointer"
									>
										<div className="flex justify-between gap-6">
											<div className="flex-1 space-y-3">
												{/* TEAM A */}
												<div className="flex justify-between items-center">
													<div className="flex gap-2 whitespace-nowrap text-[clamp(0.85rem,4vw,1rem)]">
														{teamA.map((p, i) => (
															<span
																key={p.id ?? i}
																className="flex items-center gap-1"
															>
																{p.id ? (
																	<Link
																		href={`/profile/${p.name}`}
																		onClick={(
																			e
																		) =>
																			e.stopPropagation()
																		}
																		className="hover:underline cursor-pointer"
																	>
																		{p.name}
																	</Link>
																) : (
																	p.name
																)}
																{p.elo !==
																	undefined && (
																	<span className="text-text-subtle text-[clamp(0.7rem,3vw,0.85rem)]">
																		({p.elo}
																		)
																	</span>
																)}
															</span>
														))}
													</div>

													{match && (
														<div className="flex items-center gap-2 shrink-0">
															<span className="text-sm text-text-muted">
																{match.score_a}
															</span>
														</div>
													)}
												</div>

												{/* TEAM B */}
												<div className="flex justify-between items-center">
													<div className="flex gap-2 whitespace-nowrap text-[clamp(0.85rem,4vw,1rem)]">
														{teamB.map((p, i) => (
															<span
																key={p.id ?? i}
																className="flex items-center gap-1"
															>
																{p.id ? (
																	<Link
																		href={`/profile/${p.name}`}
																		onClick={(
																			e
																		) =>
																			e.stopPropagation()
																		}
																		className="hover:underline cursor-pointer"
																	>
																		{p.name}
																	</Link>
																) : (
																	p.name
																)}
																{p.elo !==
																	undefined && (
																	<span className="text-text-subtle text-[clamp(0.7rem,3vw,0.85rem)]">
																		({p.elo}
																		)
																	</span>
																)}
															</span>
														))}
													</div>

													{match && (
														<div className="flex items-center gap-2 shrink-0">
															<span className="text-sm text-text-muted">
																{match.score_b}
															</span>
														</div>
													)}
												</div>
											</div>

											{/* RIGHT: Meta */}
											{match && (
												<div className="text-sm text-text-muted text-right shrink-0">
													<div>
														{teamAWon
															? "Team A Won"
															: "Team B Won"}
													</div>
													<div>
														{match.created_at &&
															new Date(
																match.created_at
															).toLocaleDateString()}
													</div>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</section>
					);
				})}
		</main>
	);
}
