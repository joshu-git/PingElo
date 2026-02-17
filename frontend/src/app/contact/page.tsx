"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ContactPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fieldClass =
		"w-full rounded-lg px-4 py-3 bg-card border border-border";

	async function submitMessage(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setSuccess(false);

		const { error } = await supabase
			.from("contact_messages")
			.insert([{ name, email, message }]);

		setLoading(false);

		if (error) {
			setError("Something went wrong. Please try again.");
			return;
		}

		setSuccess(true);
		setName("");
		setEmail("");
		setMessage("");
	}

	return (
		<div className="container py-16 space-y-16">
			{/* HEADER */}
			<section className="max-w-3xl space-y-4">
				<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
					Contact
				</h1>

				<p className="text-text-muted leading-relaxed">
					If you’d like to contribute, ask for help, or have a
					question, feel free to reach out using the form below or by
					email.
				</p>
			</section>

			{/* FORM */}
			<section className="space-y-8">
				<form onSubmit={submitMessage} className="space-y-6 max-w-3xl">
					<input
						type="text"
						placeholder="Your name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
						className={fieldClass}
					/>

					<input
						type="email"
						placeholder="Your email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						className={fieldClass}
					/>

					<textarea
						placeholder="Your message"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						required
						className={`${fieldClass} min-h-[160px]`}
					/>

					<button
						type="submit"
						disabled={loading}
						className="px-6 py-3 rounded-lg bg-accent-button text-button-text font-semibold hover:bg-accent-button-hover transition-colors"
					>
						{loading ? "Sending…" : "Send Message"}
					</button>

					{success && (
						<p className="text-sm text-text-muted">
							Message sent successfully.
						</p>
					)}

					{error && (
						<p className="text-sm text-text-muted">{error}</p>
					)}
				</form>

				{/* DIRECT EMAIL */}
				<p className="text-sm text-text-muted">
					Or email me directly at{" "}
					<a
						href="mailto:argentjackjoshua@outlook.com"
						target="_blank"
						rel="noopener noreferrer"
						className="underline hover:text-text transition"
					>
						argentjackjoshua@outlook.com
					</a>
				</p>
			</section>
		</div>
	);
}
