import { Response, NextFunction } from "express";
import { supabase } from "../libs/supabase.js";
import { requireAuth, AuthenticatedRequest } from "./requireAuth.js";

//Checks for authentication and admin
export async function requireAdmin( req: AuthenticatedRequest, res: Response, next: NextFunction ) {
  try {
    //Ensures the user is authenticated
    await new Promise<void>((resolve, reject) =>
      requireAuth(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      })
    );

    //Checks the admin column
    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", req.user!.id)
      .single();

    if (error || !data?.is_admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    //Move onto the real route handler
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}