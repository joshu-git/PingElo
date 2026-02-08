import { Request, Response, NextFunction } from "express";
import { supabase } from "../libs/supabase.js";

export interface AuthenticatedRequest extends Request {
	user?: {
		id: string;
		email: string | undefined;
	};
	group_id?: string;
}

//Function for verifying a route request
export async function requireAuth(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
) {
	const authHeader = req.headers.authorization;

	if (!authHeader) {
		return res.status(401).json({ error: "Missing Authorization header" });
	}

	const token = authHeader.replace("Bearer ", "");

	//Validates the token with supabase
	const { data, error } = await supabase.auth.getUser(token);

	if (error || !data.user) {
		return res.status(401).json({ error: "Invalid or expired token" });
	}

	//Attach user to the request so all routes can access id and email
	req.user = { id: data.user.id, email: data.user.email ?? undefined };

	next();
}
