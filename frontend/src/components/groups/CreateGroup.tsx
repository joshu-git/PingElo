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
	const [message, setMessage] = useState<string | null>(null);
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

		setLoading(true);
		setMessage(null);
		setError(null);

		try {
			const { data } = await supabase.auth.getSession();
			if (!data.session) return;

			const trimmedName = name.trim();
			if (!trimmedName) throw new Error("Group name is required");

			const { data: existingGroup, error: checkError } = await supabase
				.from("groups")
				.select("id, group_name")
				.eq("group_name", trimmedName)
				.maybeSingle();

			if (checkError) throw new Error("Failed to check group name");

			if (existingGroup) {
				throw new Error("A group with this name already exists");
			}

			const { data: sessionData } = await supabase.auth.getSession();
			if (!sessionData.session)
				throw new Error("You need to sign in to create a group");

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/groups/create`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${data.session.access_token}`,
					},
					body: JSON.stringify({
						group_name: trimmedName,
						group_description: description,
						open,
					}),
				}
			);

			if (!res.ok) {
				throw new Error(await res.text());
			}

			setName("");
			setDescription("");
			setOpen(true);
			setMessage("Group created successfully");

			const encodedGroupName = encodeURIComponent(trimmedName);
			router.push(`/groups/${encodedGroupName}`);
		} catch (err: unknown) {
			if (err instanceof Error) setError(err.message);
			else setError("Something went wrong");
		} finally {
			setLoading(false);
		}
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
				{message && (
					<p className="text-xs text-center text-green-400">
						{message}
					</p>
				)}
				{error && (
					<p className="text-xs text-center text-red-400">{error}</p>
				)}
			</form>
		</main>
	);
}
