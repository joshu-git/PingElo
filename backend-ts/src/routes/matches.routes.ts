import { Router } from "express";

import { supabase } from "../supabase.js"

//Authentication required for performing actions
import { requireAuth, AuthenticatedRequest } from "../middleware/requireAuth.js";

//Services required for routes
import { createMatch } from "../services/matches.services.js";

const router = Router();

//Helper function that validates match input
function validateMatchInput(body: any) {
    const { playerAId, playerBId, scoreA, scoreB, gamePoints } = body;
  
    //If any fields are missing then throw an error
    if (!playerAId || !playerBId || scoreA == null || scoreB == null || !gamePoints) {
        throw new Error("Missing fields");
    }

    //If the players are the same throw an error
    if (playerAId === playerBId) {
        throw new Error("Players must be different");
    }

    //Return the validated data
    return { playerAId, playerBId, scoreA, scoreB, gamePoints };
}

//Helper function that checks if the user is an admin
async function isUserAdmin(userId: string): Promise<boolean> {
    //Checks supabase to see if the user is an admin
    const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .single();

        //If the user is an admin return true
    if (error || !data) return false;
    return data.is_admin ?? false;
}

//Helper function that checks the user can create table
function checkOwnershipOrAdmin(players: any[], userId: string, isAdmin: boolean) {
    //Checks that the user owns at least one of the players
    const owns = players.some(p => p.user_id === userId);

    //If the user is not an admin or player then throw an error
    if (!owns && !isAdmin) {
        const error = new Error("You must own at least one of the players");
        (error as any).status = 403;
    throw error;
  }
}

//Route for creating a new match
router.post("/create", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      playerAId,
      playerBId,
      scoreA,
      scoreB,
      gamePoints
    } = validateMatchInput(req.body);

    //Calls admin checker function
    const isAdmin = await isUserAdmin(req.user!.id);

    //Fetch both of the players by their IDs
    const { data: players, error } = await supabase
      .from("players")
      .select("id, user_id")
      .in("id", [playerAId, playerBId]);

    //If there IDs are not valid then throw an error
    if (error || !players || players.length !== 2) {
      return res.status(400).json({ error: "Invalid player IDs" });
    }

    checkOwnershipOrAdmin(players, req.user!.id, isAdmin);

    //All checks have passed so call createMatch
    const match = await createMatch(
      req.user!.id,
      playerAId,
      playerBId,
      scoreA,
      scoreB,
      gamePoints
    );

    //A success response is sent along with the match data
    res.status(201).json({ 
        message: "Match created successfully",
        match
    });
  } catch (err: any) {
    const status = err.status || 400;
    res.status(status).json({ error: err.message });
  }
});

export default router;