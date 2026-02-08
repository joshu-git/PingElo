import { Response, NextFunction } from "express";
import { supabase } from "../libs/supabase.js";
import { requireAuth, AuthenticatedRequest } from "./requireAuth.js";

//Checks for authentication, admin and group
export async function requireAdmin(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
) {
	try {
		//Ensures the user is authenticated
		await new Promise<void>((resolve, reject) =>
			requireAuth(req, res, (err?: any) => {
				if (err) reject(err);
				else resolve();
			})
		);

		const { data: admin, error: adminError } = await supabase
			.from("account")
			.select("is_admin")
			.eq("id", req.user!.id)
			.single();

		if (adminError || !admin?.is_admin) {
			return res.status(403).json({ error: "Admin required" });
		}

		//Checks if the user is in a group
		const { data: group, error: groupError } = await supabase
			.from("players")
			.select("group_id")
			.eq("account_id", req.user!.id)
			.single();

		if (groupError || !group?.group_id) {
			return res.status(403).json({ error: "Group required" });
		}

		//Allows groupId to be used in other functions
		req.group_id = group.group_id;

		next();
	} catch (err) {
		return res.status(401).json({ error: "Unauthorized" });
	}
}
