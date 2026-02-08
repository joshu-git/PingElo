"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CreateGroup() {
	const router = useRouter();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [open, setOpen] = useState(true);

	const [canCreate, setCanCreate] = useState(false);
	const [alreadyInGroup, setAlreadyInGroup] = useState(false);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fieldClass =
		"w-full rounded-lg px-4 py-3 bg-transparent border border-border focus:outline-none focus:ring-1 focus:ring-border";

	//Load user + check if already in a group
	useEffect(() => {
		async function checkUserGroup() {
			const { data: sessionData } = await supabase.auth.getSession();
			if (!sessionData.session) {
				setCanCreate(false);
				setError("You need to sign in to create a group");
				return;
			}

			const userId = sessionData.session.user.id;

			const { data: playerData, error: playerError } = await supabase
				.from("players")
				.select("group_id")
				.eq("account_id", userId)
				.maybeSingle();

			if (playerError) {
				console.error(playerError);
				setCanCreate(false);
				return;
			}

			if (playerData?.group_id) {
				setAlreadyInGroup(true);
				setCanCreate(false);
			} else {
				setAlreadyInGroup(false);
				setCanCreate(true);
			}
		}

		checkUserGroup();
	}, []);

	async function createGroup(e: React.FormEvent) {
		e.preventDefault();
		if (!canCreate || loading) return;

		setError(null);

		const trimmedName = name.trim();
		if (!trimmedName) throw new Error("Group name is required");

		setLoading(true);

		const validNameRegex = /^[A-Za-z0-9 ]+$/;
		if (!validNameRegex.test(trimmedName)) {
			setError("Group name can only contain letters and numbers");
			setLoading(false);
			return;
		}

		if (trimmedName.length > 25) {
			setError("Group name cannot be longer than 25 characters");
			setLoading(false);
			return;
		}

		const { data: existingGroup, error: checkError } = await supabase
			.from("groups")
			.select("id, group_name")
			.eq("group_name", trimmedName)
			.maybeSingle();

		if (checkError) {
			setLoading(false);
			setError("Failed to check group name");
			return;
		}

		if (existingGroup) {
			setLoading(false);
			setError("A group with this name already exists");
			return;
		}

		const { data: sessionData } = await supabase.auth.getSession();
		if (!sessionData.session) {
			setLoading(false);
			setError("Not signed in");
			return;
		}

		const res = await fetch(
			`${process.env.NEXT_PUBLIC_BACKEND_URL}/groups/create`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${sessionData.session.access_token}`,
				},
				body: JSON.stringify({
					group_name: trimmedName,
					group_description: description,
					open,
				}),
			}
		);

		if (!res.ok) {
			const { error } = await res.json();
			setLoading(false);
			setError(error || "Failed to create group");
			return;
		}

		setLoading(false);

		const encodedGroupName = encodeURIComponent(trimmedName);
		router.push(`/groups/${encodedGroupName}`);
	}

	return (
		<main className="max-w-5xl mx-auto px-4 py-16 space-y-12">
			<section className="text-center space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold">
					Create Group
				</h1>
				<p className="text-text-muted max-w-2xl mx-auto">
					Create a new group and configure its basic settings.
				</p>
			</section>

			<form onSubmit={createGroup} className="w-full space-y-8">
				<input
					className={fieldClass}
					placeholder="Group Name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					disabled={!canCreate}
				/>

				<input
					className={fieldClass}
					placeholder="Description (optional)"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					disabled={!canCreate}
				/>

				<div className="flex items-center space-x-2">
					<input
						id="open"
						type="checkbox"
						checked={open}
						onChange={(e) => setOpen(e.target.checked)}
						className="h-5 w-5"
						disabled={!canCreate}
					/>
					<label htmlFor="open" className="text-text-muted">
						Open to new members
					</label>
				</div>

				<button
					type="submit"
					disabled={!canCreate || loading}
					className="w-full px-4 py-3 rounded-lg font-semibold"
				>
					{loading ? "Creating…" : "Create Group"}
				</button>

				{alreadyInGroup && (
					<p className="text-xs text-center text-text-muted">
						You are already in a group
					</p>
				)}

				{error && (
					<p className="text-xs text-center text-red-400">{error}</p>
				)}
			</form>
		</main>
	);
}
