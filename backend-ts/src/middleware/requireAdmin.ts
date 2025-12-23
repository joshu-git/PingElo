import { Response, NextFunction } from "express";
import { supabase } from "../libs/supabase.js";
import { requireAuth, AuthenticatedRequest } from "./requireAuth.js";

//Checks for authentication, admin and to be in a group
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

		//Checks if the user is an admin
		const { data: admin, error: adminError } = await supabase
			.from("account")
			.select("is_admin")
			.eq("id", req.user!.id)
			.single();

		//If the user is not an admin then throw an error
		if (adminError || !admin?.is_admin) {
			return res.status(403).json({ error: "Admin required" });
		}

		//Checks if the user is in a group
		const { data: group, error: groupError } = await supabase
			.from("players")
			.select("group_id")
			.eq("account_id", req.user!.id)
			.single();

		//If the user is not in a group then throw an error
		if (groupError || !group?.group_id) {
			return res.status(403).json({ error: "Group required" });
		}

		//Allows groupId can be used in other functions
		req.group_id = group.group_id;

		//Move onto the real route handler
		next();
	} catch (err) {
		return res.status(401).json({ error: "Unauthorized" });
	}
}
