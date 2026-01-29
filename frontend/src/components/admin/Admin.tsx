"use client";

import { supabase } from "@/lib/supabase";

//Checks the user is authenticated then sends request
async function adminFetch(path: string, body?: Record<string, unknown>) {
	const { data } = await supabase.auth.getSession();
	if (!data.session) throw new Error("Not authenticated");

	return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${path}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${data.session.access_token}`,
		},
		body: body ? JSON.stringify(body) : undefined,
	});
}

//Shows bootstraps and match table with admin options
export default function Admin() {
	//Runs dry and normal bootstrap with warning
	async function runBootstrap(real: boolean) {
		if (real && !confirm("This will recalculate all elo values. Continue?"))
			return;

		await adminFetch(
			real ? "/admin/bootstrap" : "/admin/dry-run/bootstrap"
		);

		alert(real ? "Bootstrap complete" : "Dry run complete");
	}

	return (
		<div className="max-w-6xl mx-auto mt-10 space-y-6 px-4">
			<h1 className="text-3xl font-bold">Admin Dashboard</h1>

			<div className="flex gap-4">
				<button
					onClick={() => runBootstrap(false)}
					className="px-4 py-2 bg-gray-600 rounded-xl"
				>
					Dry Run Bootstrap
				</button>

				<button
					onClick={() => runBootstrap(true)}
					className="px-4 py-2 bg-red-600 rounded-xl"
				>
					Run Bootstrap
				</button>
			</div>
		</div>
	);
}
