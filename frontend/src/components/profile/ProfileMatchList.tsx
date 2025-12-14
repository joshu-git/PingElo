import Link from "next/link";
import type { MatchRow } from "@/types/matches";

type MatchWithPlayers = MatchRow & {
  player_a: { username: string };
  player_b: { username: string };
};

export default function ProfileMatchList({
  matches,
}: {
  matches: MatchWithPlayers[];
}) {
  return (
    <div className="bg-black/40 rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-4">Matches</h2>

      <div className="divide-y divide-white/10">
        {matches.map((m) => (
          <Link
            key={m.id}
            href={`/matches/${m.id}`}
            className="block py-3 hover:bg-white/5 transition px-2 rounded"
          >
            <div className="flex justify-between">
              <span>
                {m.player_a.username} vs{" "}
                {m.player_b.username}
              </span>
              <span className="text-gray-400">
                {m.score_a} – {m.score_b}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
