"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export type EloPoint = {
  match: number;
  elo: number;
};

export function EloChart({ data }: { data: EloPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-gray-400 text-sm">
        No Elo history available.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <XAxis
          dataKey="match"
          tick={{ fill: "#aaa", fontSize: 12 }}
        />
        <YAxis
          tick={{ fill: "#aaa", fontSize: 12 }}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#111",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
          }}
          labelStyle={{ color: "#aaa" }}
        />
        <Line
          type="monotone"
          dataKey="elo"
          stroke="#4f46e5"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}