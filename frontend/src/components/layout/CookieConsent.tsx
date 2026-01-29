"use client";

import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function CookieConsent() {
	const [consent, setConsent] = useState<"accepted" | "declined" | null>(
		null
	);
	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [visible, setVisible] = useState(false);

	//Initialize theme & consent safely
	useEffect(() => {
		const storedTheme = localStorage.getItem("theme");
		const storedConsent = localStorage.getItem("cookieConsent");

		//Defer state updates to next tick to avoid cascading renders
		setTimeout(() => {
			if (storedTheme === "light" || storedTheme === "dark")
				setTheme(storedTheme as "light" | "dark");

			if (storedConsent === "true") setConsent("accepted");
			else if (storedConsent === "false") setConsent("declined");
			else setVisible(true);
		}, 0);
	}, []);

	const accept = () => {
		localStorage.setItem("cookieConsent", "true");
		setConsent("accepted");
		setVisible(false);
	};

	const decline = () => {
		localStorage.setItem("cookieConsent", "false");
		setConsent("declined");
		setVisible(false);
	};

	//Only render analytics if consent accepted
	if (consent === "accepted") {
		return (
			<>
				<Analytics />
				<SpeedInsights />
			</>
		);
	}

	//Don't render anything if user declined or banner hidden
	if (consent === "declined" || !visible) return null;

	const overlayColor =
		theme === "dark" ? "rgba(31,31,31,0.85)" : "rgba(241,241,241,0.85)";

	return (
		<div
			className={`fixed inset-0 z-[1000] flex items-center justify-center backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
				visible ? "opacity-100" : "opacity-0"
			}`}
			style={{ backgroundColor: overlayColor }}
		>
			<div className="bg-card p-6 rounded-xl max-w-lg w-full mx-4 text-center space-y-4 transition-transform duration-300 ease-in-out transform hover-card">
				<p className="text-text">
					We use cookies and analytics to improve your experience and
					measure performance. You can accept or decline.
				</p>
				<div className="flex justify-center gap-4">
					<button
						onClick={decline}
						className="px-4 py-2 rounded-lg bg-bg-soft text-text-muted hover:bg-bg-muted"
					>
						Decline
					</button>
					<button onClick={accept} className="px-4 py-2 rounded-lg">
						Accept
					</button>
				</div>
			</div>
		</div>
	);
}
