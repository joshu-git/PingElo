import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
    title: "Pingelo",
    description: "Elo ranking system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="bg-black text-white flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
                    {children}
                </main>
                <Footer />
            </body>
        </html>
    );
}