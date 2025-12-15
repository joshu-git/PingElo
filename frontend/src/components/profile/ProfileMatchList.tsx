import Link from "next/link";
import type { MatchRow } from "@/types/matches";

export type MatchWithNames = MatchRow & {
  playerAName: string;
  playerBName: string;
};

export default function ProfileMatchList({
  matches,
}: {
  matches: MatchWithNames[];
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
                {m.playerAName} vs {m.playerBName}
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