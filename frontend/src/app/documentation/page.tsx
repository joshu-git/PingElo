import Link from "next/link";

export default function DocumentationPage() {
	return (
		<div className="container py-16 space-y-16 md:space-y-20">
			{/* HERO */}
			<section className="max-w-3xl space-y-4 md:space-y-6">
				<h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
					Documentation
				</h1>

				<p className="text-lg">
					Documentation and guides for PingElo to make it more
					accessible to those who use or collaborate on PingElo
				</p>

				<div className="flex flex-wrap gap-4 pt-2">
					<Link href="/">
						<button
							className="px-3 py-1 bg-card border border-[var(--color-border)] rounded-md hover:bg-accent-soft transition-colors"
							style={{ color: "var(--color-text)" }}
						>
							Home
						</button>
					</Link>

					<a
						href="https://github.com/joshu-git/pingelo"
						target="_blank"
						rel="noopener noreferrer"
					>
						<button
							className="px-3 py-1 bg-card border border-[var(--color-border)] rounded-md hover:bg-accent-soft transition-colors"
							style={{ color: "var(--color-text)" }}
						>
							GitHub
						</button>
					</a>

					<Link href="/documentation/accounts">
						<button
							className="px-3 py-1 bg-card border border-[var(--color-border)] rounded-md hover:bg-accent-soft transition-colors"
							style={{ color: "var(--color-text)" }}
						>
							Accounts
						</button>
					</Link>
				</div>
			</section>
		</div>
	);
}
