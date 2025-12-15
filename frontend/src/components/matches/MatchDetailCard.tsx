"use client";

import Link from "next/link";

// Updated match type to match new structure
type MatchDetail = {
  id: string;
  match_number: number;
  player_a_username: string;
  player_b_username: string;
  score_a: number;
  score_b: number;
  game_points: number;
  elo_change_a: number | null;
  elo_change_b: number | null;
  winner: string | null;
};

// Shows the details of a match
export default function MatchDetailCard({ match }: { match: MatchDetail }) {
  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl p-6 shadow-xl">
      <h2 className="text-xl font-bold mb-4">Match #{match.match_number}</h2>

      <div className="flex justify-between items-center mb-4">
        <div>
          <Link
            href={`/profile/${match.player_a_username}`}
            className="text-purple-400 hover:underline"
          >
            {match.player_a_username}
          </Link>
          <span className="mx-2">vs</span>
          <Link
            href={`/profile/${match.player_b_username}`}
            className="text-purple-400 hover:underline"
          >
            {match.player_b_username}
          </Link>
        </div>

        <div className="font-semibold">
          {match.score_a} – {match.score_b}
        </div>
      </div>

      <div className="text-sm text-white/70">
        <p>Game Points: {match.game_points}</p>
        {match.elo_change_a !== null && (
          <p>
            Elo Change:{" "}
            <span className="text-green-400">
              A {match.elo_change_a > 0 && "+"}
              {match.elo_change_a}
            </span>{" "}
            /{" "}
            <span className="text-red-400">B {match.elo_change_b}</span>
          </p>
        )}
      </div>
    </div>
  );
}