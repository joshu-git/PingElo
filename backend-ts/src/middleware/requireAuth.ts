import { Request, Response, NextFunction } from "express";
import { supabase } from "../libs/supabase.js"

//Extends express request object to include user
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string | undefined
    };
}

//Function for verifying a route request
export async function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    //Gets the frontend to send JWT token
    const authHeader = req.headers.authorization;

    //If there is no JWT token then throw an error
    if (!authHeader) {
        return res.status(401).json({ error: "Missing Authorization header" });
    }

    //Extracts the actual JWT token
    const token = authHeader.replace("Bearer ", "");

    //Validates the token with supabase
    const { data, error } = await supabase.auth.getUser(token);

    //If the JWT is invalid or expired then block the request
    if (error || !data.user) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }

    //Attach user to the request so all routes can access id and email
    req.user = { id: data.user.id, email: data.user.email ?? undefined };

    //Move on to the real route handler
    next();
}