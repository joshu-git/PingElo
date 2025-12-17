"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

//Function for signing in
export default function SignIn() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    //Uses the sign in information
    async function signIn(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        
        //If there is an error then stop loading and show error
        if (error) {
            setLoading(false);
            alert(error.message);
            return;
        }

        //User is authenticated
        const userId = data.user.id;

        //Look up linked player
        const { data: player } = await supabase
            .from("players")
            .select("username")
            .eq("user_id", userId)
            .maybeSingle();

        setLoading(false);

        //Redirect based on player existence
        if (player && player.username) {
            router.push(`/profile/${player.username}`);
        } else {
            router.push("/account/claim");
        }
    }

    //Displays sign in information
    return (
        <div className="w-full flex justify-center mt-10">
            <form
                onSubmit={signIn}
                className="
                    w-full 
                    max-w-md 
                    sm:max-w-lg
                    md:max-w-xl
                    bg-black/40 
                    border border-white/10 
                    rounded-xl 
                    p-6 
                    flex flex-col gap-4 
                    shadow-lg
                "
            >
                <h1 className="text-2xl font-bold text-center mb-1">
                    Sign In
                </h1>

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-black/60 border border-white/20 rounded-lg p-3"
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-black/60 border border-white/20 rounded-lg p-3"
                    required
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="
                        w-full py-3 bg-purple-600 
                        hover:bg-purple-700 
                        rounded-lg font-semibold 
                        transition
                    "
                >
                    {loading ? "Signing In..." : "Sign In"}
                </button>

                <div className="text-center text-sm text-white/70 mt-2">
                    Need an account?
                </div>

                <Link
                    href="/account/signup"
                    className="
                        w-full text-center py-2 
                        border border-white/20 
                        rounded-lg 
                        hover:bg-white/10 
                        transition
                    "
                >
                    Sign Up
                </Link>
            </form>
        </div>
    );
}