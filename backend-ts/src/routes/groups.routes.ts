import { Router } from "express";
import { supabase } from "../libs/supabase.js";
import {
	AuthenticatedRequest,
	requireAuth,
} from "../middleware/requireAuth.js";
import { createGroup } from "../services/groups.services.js";

const router = Router();

/* ================= CREATE GROUP ================= */
router.post("/create", requireAuth, async (req: AuthenticatedRequest, res) => {
	try {
		const { group_name, group_description, open } = req.body as {
			group_name?: string;
			group_description?: string;
			open?: boolean;
		};

		if (!group_name || !group_name.trim()) {
			return res.status(400).json({ error: "Group name is required" });
		}

		// User must have a player
		const { data: player, error: playerError } = await supabase
			.from("players")
			.select("id, group_id")
			.eq("account_id", req.user!.id)
			.maybeSingle();

		if (playerError) throw playerError;

		if (!player) {
			return res.status(400).json({
				error: "You must have a player to create a group",
			});
		}

		if (player.group_id) {
			return res.status(400).json({
				error: "You are already in a group",
			});
		}

		// Group name must be unique
		const { data: existingGroup } = await supabase
			.from("groups")
			.select("id")
			.eq("group_name", group_name.trim())
			.maybeSingle();

		if (existingGroup) {
			return res.status(400).json({
				error: "A group with this name already exists",
			});
		}
		const group = await createGroup(
			group_name.trim(),
			open ?? true,
			req.user!.id,
			player.id,
			group_description
		);

		res.status(201).json(group);
	} catch (err: unknown) {
		if (err instanceof Error) {
			return res.status(400).json({ error: err.message });
		}
		return res.status(500).json({ error: "Unknown error" });
	}
});

export default router;
