"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

//Function for signing up
export default function SignupPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [claimCode, setClaimCode] = useState("");

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    //Uses signup information
    async function signup(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        try {
            //Create user
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;
            if (!data.session) throw new Error("Signup succeeded but session missing.");

            const accessToken = data.session.access_token;

            //If user entered a claim code, try to claim immediately
            if (claimCode.trim().length > 0) {
                await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/players/claim`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ claimCode }),
                });
            }

            //Redirect either way
            router.push("/profile");
        } catch (err: unknown) {
            if (err instanceof Error) {
                throw new Error(err.message);
            }
            throw new Error("Unknown error occurred");
        }
    }

    //Displays signup information
    return (
        <div className="w-full flex justify-center">
            <form
                onSubmit={signup}
                className="w-full max-w-md bg-black/40 border border-white/10 rounded-xl p-6 shadow-lg flex flex-col gap-4"
            >
                <h1 className="text-2xl font-bold text-center mb-2">Create Account</h1>

                {errorMsg && (
                    <p className="text-red-400 text-sm text-center">{errorMsg}</p>
                )}

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-black/60 border border-white/20 rounded-lg p-2"
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-black/60 border border-white/20 rounded-lg p-2"
                />

                <input
                    type="text"
                    placeholder="Claim Code (optional)"
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value)}
                    className="bg-black/60 border border-white/20 rounded-lg p-2"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition"
                >
                    {loading ? "Creating account..." : "Sign Up"}
                </button>

                <p className="text-center text-sm text-gray-400">
                    Already have an account?{" "}
                    <a href="/login" className="text-purple-400 hover:text-purple-300">
                        Login
                    </a>
                </p>
            </form>
        </div>
    );
}