export default function Footer() {
    return (
        <footer className="bg-black text-white border-t border-white/10 py-6 mt-auto">
            <div className="max-w-4xl mx-auto px-4 text-center space-y-1">
                <p className="text-sm font-medium">© {new Date().getFullYear()} Pingelo</p>
                <p className="text-xs text-white/60">
                    Built with Vercel, Render, and Supabase | Open Source
                </p>
            </div>
        </footer>
    );
}