import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

//Handles analytics in vercel
import { Analytics } from "@vercel/analytics/next";

//Handles speed insights in vercel
import { SpeedInsights } from "@vercel/speed-insights/next";

import type { Metadata } from "next";

//Metadata for SEO and social previews
export const metadata: Metadata = {
	title: {
		default: "PingElo",
		template: "%s | PingElo",
	},
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

//RootLayout wraps all pages: includes Header, Footer, and main content
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
        document.documentElement.setAttribute(
            "data-theme",
            prefersDark ? "dark" : "light"
        );
    } catch (e) {}
})();
                        `,
					}}
				/>
			</head>

			{/* Body is flex column for header + main + footer layout */}
			<body className="flex flex-col min-h-screen">
				<Analytics />
				<SpeedInsights />

				{/* Header component: contains navigation */}
				<Header />

				{/* Main content container */}
				<main className="flex-1 max-w-4xl w-full px-4 py-6 mx-auto sm:px-6 lg:px-8">
					{children}
				</main>

				{/* Footer component: contains copyright / links */}
				<Footer />
			</body>
		</html>
	);
}
