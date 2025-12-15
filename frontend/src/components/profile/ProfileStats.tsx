import { useMemo } from "react";
import type { MatchRow } from "@/types/matches";

export default function ProfileStats({
  playerId,
  matches,
}: {
  playerId: string;
  matches: MatchRow[];
}) {
  const stats = useMemo(() => {
    let wins = 0;
    let losses = 0;

    for (const m of matches) {
      if (!m.winner) continue;
      if (m.winner === playerId) wins++;
      else losses++;
    }

    return {
      wins,
      losses,
      ratio:
        wins + losses > 0
          ? (wins / losses).toFixed(2)
          : "0.00",
    };
  }, [matches, playerId]);

  return (
    <div className="grid grid-cols-3 gap-4 text-center">
      <Stat label="Wins" value={stats.wins} />
      <Stat label="Losses" value={stats.losses} />
      <Stat label="Win Ratio" value={stats.ratio} />
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-black/40 rounded-xl p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}