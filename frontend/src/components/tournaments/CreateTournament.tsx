"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CreateTournament() {
	const [name, setName] = useState("");
	const [type, setType] = useState<"singles" | "doubles">("singles");
	const [startDate, setStartDate] = useState("");
	const [loading, setLoading] = useState(false);

	async function createTournament() {
		setLoading(true);

		const session = await supabase.auth.getSession();
		const token = session.data.session?.access_token;

		await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournaments/create`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				tournament_name: name,
				start_date: startDate,
				match_type: type,
			}),
		});

		setLoading(false);
	}

	return (
		<div className="p-6 max-w-xl mx-auto">
			<h1 className="text-3xl font-bold mb-6">Create Tournament</h1>

			<div className="space-y-4">
				<input
					className="w-full rounded-lg bg-black/40 border border-white/10 p-3"
					placeholder="Tournament name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>

				<input
					type="date"
					className="w-full rounded-lg bg-black/40 border border-white/10 p-3"
					value={startDate}
					onChange={(e) => setStartDate(e.target.value)}
				/>

				<select
					className="w-full rounded-lg bg-black/40 border border-white/10 p-3"
					value={type}
					onChange={(e) =>
						setType(e.target.value as "singles" | "doubles")
					}
				>
					<option value="singles">Singles</option>
					<option value="doubles">Doubles</option>
				</select>

				<button
					onClick={createTournament}
					disabled={loading}
					className="w-full rounded-lg bg-white text-black font-semibold py-3 hover:bg-gray-200 transition"
				>
					{loading ? "Creating..." : "Create Tournament"}
				</button>
			</div>
		</div>
	);
}
