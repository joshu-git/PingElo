import { PlayerRow } from "@/types/players";
import { supabase } from "@/lib/supabase";

//Fetches players from supabase
export async function fetchPlayers(): Promise<PlayerRow[]> {
    const { data, error } = await supabase
        .from("players")
        .select("id, username, elo");

    if (error) {
        console.error("Error fetching players:", error);
        return [];
    }

    return data;
}

//Fetches leaderboard of players
export async function fetchLeaderboard(): Promise<PlayerRow[]> {
    const { data, error } = await supabase
        .from("players")
        .select("id, username, elo")
        .order("elo", { ascending: false });

    if (error) {
        console.error("Failed to fetch leaderboard:", error);
        throw new Error("Could not load leaderboard");
    }

    return data;
}