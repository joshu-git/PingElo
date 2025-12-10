"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

//Function for login
export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const router = useRouter();

    //Function for handling the login
    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();

        //Sign into supabase using details
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        
        //If there is not an error go to the matches page
        if (error) {
            setError(error.message);
        } else {
            router.push("/matches");
        }
    }

    //Display to the user
    return (
        //Call handleLogin after submission
        <form onSubmit={handleLogin}>
        <h1>Login</h1>

        <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
        />

        <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Login</button>

        {error && <p>{error}</p>}
        </form>
    );
}
