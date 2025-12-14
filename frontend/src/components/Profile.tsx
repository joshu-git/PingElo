"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { PlayerRow } from "@/types/players";

export default function ProfileRedirectPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<PlayerRow | null>(null);

  useEffect(() => {
    async function load() {
      //Get authenticated user
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setLoading(false);
        return;
      }

      const authUser = data.user;
      setUser(authUser);

      //If logged in, attempt to load linked player
      if (authUser) {
        const { data: playerData } = await supabase
          .from("players")
          .select("*")
          .eq("user_id", authUser.id)
          .maybeSingle();

        if (playerData) {
          setPlayer(playerData);
        }
      }

      setLoading(false);
    }

    load();
  }, []);

  // Redirects MUST happen in effects, not render
  useEffect(() => {
    if (!loading && player) {
      router.replace(`/profile/${player.username}`);
    }
  }, [loading, player, router]);

  if (loading) return null;

  //CASE 1: Not logged in
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <button
          onClick={() => router.push("/login")}
          className="px-6 py-3 bg-white text-black rounded-xl hover:opacity-80 transition"
        >
          Login
        </button>
      </div>
    );
  }

  //CASE 2: Logged in but no player claimed
  if (!player) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <button
          onClick={() => router.push("/claim")}
          className="px-6 py-3 bg-white text-black rounded-xl hover:opacity-80 transition"
        >
          Claim Player
        </button>
      </div>
    );
  }

  //CASE 3: Redirect handled by effect
  return null;
}
