"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

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

    //Change loading status
    setLoading(false);

    //Shows error message or pushes user to /match
    if (error) {
        alert(error.message);
    } else {
        router.push("/match");
    }
}

//Displays login information
return (
    <form onSubmit={login}>
        <h1>Login</h1>

        <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
        />

        <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
        />

        <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
        </button>
    </form>
  );
}
