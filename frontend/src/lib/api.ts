import { Player } from "@/types/player";
import { supabase } from "@/lib/supabase";

//Fetches players from supabase
export async function fetchPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("id, username");

  if (error) {
    console.error("Error fetching players:", error);
    return [];
  }

  return data;
}