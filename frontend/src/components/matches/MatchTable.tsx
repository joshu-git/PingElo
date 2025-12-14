"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type MatchRow = {
    id: string;
    match_number: number;
};

//Shows all matches in a table
export default function MatchTable({
    renderActions,
}: {
    renderActions?: (matchId: string) => React.ReactNode;
}) {
    const [matches, setMatches] = useState<MatchRow[]>([]);

    useEffect(() => {
        supabase
            .from("matches")
            .select("id, match_number")
            .order("match_number")
            .then(({ data }) => setMatches(data ?? []));
    }, []);

    return (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
            <table className="w-full text-sm">
                <thead className="text-white/60">
                    <tr>
                        <th className="py-2">#</th>
                        <th>Match</th>
                        {renderActions && <th>Actions</th>}
                    </tr>
                </thead>

            <tbody>
                {matches.map((m) => (
                    <tr
                        key={m.id}
                        className="border-t border-white/10 hover:bg-white/5"
                    >
                        <td className="py-2 text-center">{m.match_number}</td>

                        <td className="text-center">
                            <Link
                                href={`/matches/${m.id}`}
                                className="text-purple-400 hover:underline"
                        >
                            View
                            </Link>
                        </td>

                        {renderActions && (
                            <td className="text-center">
                                {renderActions(m.id)}
                            </td>
                        )}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );
}