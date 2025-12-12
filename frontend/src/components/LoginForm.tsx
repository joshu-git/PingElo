"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

//Function for logging in
export default function LoginForm() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    //Uses the login information
    async function login(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        //Sets loading status
        setLoading(false);
        
        //Shows error message or pushes user to /submitmatch
        if (error) {
            alert(error.message);
        } else {
            router.push("/submitmatch");
        }
    }

    //Displays login information
    return (
        <div className="w-full flex justify-center mt-10">
            <form
                onSubmit={login}
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
                    Login
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
                    {loading ? "Logging in..." : "Login"}
                </button>

                <div className="text-center text-sm text-white/70 mt-2">
                    Don’t have an account?
                </div>

                <Link
                    href="/signup"
                    className="
                        w-full text-center py-2 
                        border border-white/20 
                        rounded-lg 
                        hover:bg-white/10 
                        transition
                    "
                >
                    Create Account
                </Link>
            </form>
        </div>
    );
}