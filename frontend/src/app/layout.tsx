import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import CookieConsent from "@/components/layout/CookieConsent";

import type { Metadata } from "next";

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
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* Set theme BEFORE first paint to avoid flash */}
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

			<body className="flex min-h-screen flex-col">
				<Sidebar />

				<main className="flex-1 w-full">{children}</main>

				<Footer />

				{/* Cookie consent overlay */}
				<CookieConsent />
			</body>
		</html>
	);
}
