"use client";

import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Metadata } from "next";

// Dynamically import analytics (no require)
const Analytics = dynamic(
	() => import("@vercel/analytics/next").then((mod) => mod.Analytics),
	{ ssr: false }
);
const SpeedInsights = dynamic(
	() =>
		import("@vercel/speed-insights/next").then((mod) => mod.SpeedInsights),
	{ ssr: false }
);

export const metadata: Metadata = {
	title: { default: "PingElo", template: "%s | PingElo" },
	description:
		"PingElo is a competitive ping pong Elo ranking system. Track matches, climb the leaderboard, and see who is the best.",
	keywords: [
		"ping pong elo",
		"ping pong rankings",
		"table tennis elo",
		"ping pong leaderboard",
		"table tennis rankings",
		"competitive ping pong",
	],
	metadataBase: new URL("https://pingelo.vercel.app"),
	openGraph: {
		title: "PingElo - Ping Pong Elo Rankings",
		description:
			"Track ping pong matches, climb the leaderboard, and see who is the best using a competitive Elo system.",
		url: "https://pingelo.vercel.app",
		siteName: "PingElo",
		locale: "en_US",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "PingElo - Ping Pong Elo Rankings",
		description:
			"Track ping pong matches and compete on a public Elo leaderboard.",
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [cookiesConsent, setCookiesConsent] = useState<
		"accepted" | "declined" | null
	>(null);
	const [theme, setTheme] = useState<"light" | "dark">("light");

	useEffect(() => {
		setTimeout(() => {
			try {
				const stored = localStorage.getItem("theme");
				if (stored === "light" || stored === "dark")
					setTheme(stored as "light" | "dark");
				else {
					const prefersDark = window.matchMedia(
						"(prefers-color-scheme: dark)"
					).matches;
					setTheme(prefersDark ? "dark" : "light");
				}

				const storedConsent = localStorage.getItem("cookieConsent");
				if (storedConsent === "true") setCookiesConsent("accepted");
				else if (storedConsent === "false")
					setCookiesConsent("declined");
			} catch (e) {
				console.error("Error reading localStorage", e);
			}
		}, 0);
	}, []);

	const acceptCookies = () => {
		localStorage.setItem("cookieConsent", "true");
		setCookiesConsent("accepted");
	};

	const declineCookies = () => {
		localStorage.setItem("cookieConsent", "false");
		setCookiesConsent("declined");
	};

	// Overlay colors for light/dark mode
	const overlayColor =
		theme === "dark" ? "rgba(31,31,31,0.8)" : "rgba(241,241,241,0.8)";

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
(function () {
    try {
        const stored = localStorage.getItem("theme");
        if (stored === "light" || stored === "dark") {
            document.documentElement.setAttribute("data-theme", stored);
            return;
        }
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } catch (e) {}
})();
            `,
					}}
				/>
			</head>

			<body className="flex flex-col min-h-screen relative">
				<Header />

				<main className="flex-1 max-w-4xl w-full px-4 py-6 mx-auto sm:px-6 lg:px-8">
					{children}
				</main>

				<Footer />

				{/* Load analytics only if consented */}
				{cookiesConsent === "accepted" && (
					<>
						<Analytics />
						<SpeedInsights />
					</>
				)}

				{/* Cookie consent modal */}
				{cookiesConsent === null && (
					<div
						className="fixed inset-0 z-[1000] flex items-center justify-center backdrop-blur-sm"
						style={{ backgroundColor: overlayColor }}
					>
						<div className="bg-card p-6 rounded-xl max-w-lg w-full mx-4 text-center space-y-4">
							<p className="text-text">
								We use cookies and analytics to improve your
								experience and measure performance. You can
								accept or decline.
							</p>
							<div className="flex justify-center gap-4">
								<button
									onClick={acceptCookies}
									className="px-4 py-2 rounded-lg"
								>
									Accept
								</button>
								<button
									onClick={declineCookies}
									className="px-4 py-2 rounded-lg bg-bg-soft text-text-muted hover:bg-bg-muted"
								>
									Decline
								</button>
							</div>
						</div>
					</div>
				)}
			</body>
		</html>
	);
}
