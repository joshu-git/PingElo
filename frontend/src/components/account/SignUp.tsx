
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

//Function for signing up
export default function SignUp() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    //Uses the sign up information
    async function signUp(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        //Create user
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        //Sets loading status
        setLoading(false);
        
        //Shows error message or pushes user to /profile
        if (error) {
            alert(error.message);
        } else {
            router.push("/profile");
        }
    }

    //Displays sign up information
    return (
        <div className="w-full flex justify-center mt-10">
            <form
                onSubmit={signUp}
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
                    Sign Up
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
                    {loading ? "Signing Up..." : "Sign Up"}
                </button>

                <div className="text-center text-sm text-white/70 mt-2">
                    Have an account?
                </div>

                <Link
                    href="/signin"
                    className="
                        w-full text-center py-2 
                        border border-white/20 
                        rounded-lg 
                        hover:bg-white/10 
                        transition
                    "
                >
                    Sign In
                </Link>
            </form>
        </div>
    );
}