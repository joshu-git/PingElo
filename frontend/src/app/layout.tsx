import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

//Handles analytics in vercel
import { Analytics } from "@vercel/analytics/next"

//Metadata for SEO and social previews
export const metadata = {
    title: "PingElo",
    description: "Elo ranking system",
};

//RootLayout wraps all pages: includes Header, Footer, and main content
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            {/* Body is flex column for header + main + footer layout */}
            <body className="bg-black text-white flex flex-col min-h-screen">

                <Analytics/>

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