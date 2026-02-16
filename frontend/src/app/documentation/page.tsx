import Link from "next/link";

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-8">
			<h2 className="text-2xl font-bold">{title}</h2>
			{children}
		</section>
	);
}

function Card({ children }: { children: React.ReactNode }) {
	return <div className="bg-card p-6 hover-card space-y-3">{children}</div>;
}

export default function DocumentationPage() {
	return (
		<div className="container py-16 space-y-16 md:space-y-20">
			{/* HERO */}
			<section className="max-w-3xl space-y-4 md:space-y-6">
				<h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
					Documentation
				</h1>

				<p className="text-lg">
					Documentation and guides for PingElo users and web
					developers who would like to contribute; we are open source.
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

					<Link href="/documentation/account">
						<button
							className="px-4 py-2 bg-accent-button text-button-text rounded-lg font-semibold hover:bg-accent-button-hover transition-colors"
							style={{ color: "var(--color-text)" }}
						>
							Account
						</button>
					</Link>
				</div>
			</section>

			{/* OVERVIEW */}
			<Section title="Overview">
				<div className="max-w-3xl space-y-4 text-text-muted leading-relaxed">
					<p>
						PingElo was built to solve a real problem in my college
						table tennis group: tracking rankings, determining
						relative skill levels, and running tournaments without
						spreadsheets or paid software.
					</p>
					<p>
						The platform is actively used by my group and supports
						any collection of players who want a fair, automated,
						and competitive ranking system with minimal friction.
					</p>
				</div>
			</Section>

			{/* FIRST STEPS */}
			<Section title="First Steps">
				<div className="grid md:grid-cols-3 gap-6">
					<Card>
						<h3 className="font-semibold">1. Sign Up</h3>
						<ul className="list-disc pl-5 text-text-muted space-y-1">
							<li>
								Go to the{" "}
								<Link
									href="/account/signup"
									className="underline hover:text-text transition"
								>
									Sign Up
								</Link>{" "}
								page
							</li>
							<li>Enter your details and player name</li>
							<li>You will be redirected to your profile</li>
						</ul>
					</Card>

					<Card>
						<h3 className="font-semibold">2. Join A Group</h3>
						<ul className="list-disc pl-5 text-text-muted space-y-1">
							<li>
								Go to the{" "}
								<Link
									href="/groups"
									className="underline hover:text-text transition"
								>
									Group
								</Link>{" "}
								page
							</li>
							<li>Find a group that you want to join</li>
							<li>Go to their page then press Join Group</li>
						</ul>
					</Card>

					<Card>
						<h3 className="font-semibold">3. Submit A Match</h3>
						<ul className="list-disc pl-5 text-text-muted space-y-1">
							<li>
								Go to the{" "}
								<Link
									href="/matches/submit"
									className="underline hover:text-text transition"
								>
									Submit Match
								</Link>{" "}
								page
							</li>
							<li>Enter the details of your first match</li>
							<li>Play five matches to get your rank</li>
						</ul>
					</Card>
				</div>
			</Section>

			{/* WHAT NEXT? */}
			<Section title="What Next?">
				<div className="max-w-3xl space-y-4 text-text-muted leading-relaxed">
					<p>
						PingElo is not just for singles. We have doubles, and
						tournaments which you may have already looked at.
						Doubles has a seperate leaderboard and tournaments have
						double the risk and reward.
					</p>
					<p>
						Currently tournaments do not support doubles and only
						have single elimination but you can see our roadmap
						below for the updates we have planned.
					</p>
				</div>
			</Section>

			{/* ROADMAP */}
			<Section title="Update Roadmap">
				<Card>
					<img
						src="/first-roadmap.png"
						alt="First Update Roadmap"
						className="w-full rounded-lg border border-[var(--color-border)]"
					/>
					<p className="text-sm text-text-muted mt-2">
						Roadmap is subject to change - please{" "}
						<Link
							href="/contact"
							className="underline hover:text-text transition"
						>
							contact
						</Link>{" "}
						us with any suggestions.
					</p>
				</Card>
			</Section>

			{/* FAIR PLAY*/}
			<Section title="Fair Play">
				<div className="max-w-3xl space-y-4 text-text-muted leading-relaxed">
					<p>
						Rules are set by the group or tournament owner; please
						ensure you know the rules of a tournament before signing
						up. If you forfeit, your opponent has the right to put
						in a winning match against you.
					</p>
					<p>
						Dashboards will be released soon for rule breakers.
						Reporting will soon be enabled on profiles. This is not
						on the roadmap as it is a key feature.
					</p>
				</div>
			</Section>

			{/* CONTACT*/}
			<section>
				<p className="text-sm text-text-subtle">
					Have any questions?{" "}
					<Link
						href="/contact"
						className="underline hover:text-text transition"
					>
						Contact Us
					</Link>
				</p>
			</section>
		</div>
	);
}
