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

export default function AccountDocumentationPage() {
	return (
		<div className="container py-16 space-y-16 md:space-y-20">
			{/* HERO */}
			<section className="max-w-3xl space-y-4 md:space-y-6">
				<h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
					Account Documentation
				</h1>

				<p className="text-lg">
					Documentation and guides for PingElo users and web
					developers who would like to contribute; we are open source.
				</p>

				<div className="flex flex-wrap gap-4 pt-2">
					<Link href="/documentation">
						<button
							className="px-3 py-1 bg-card border border-[var(--color-border)] rounded-md hover:bg-accent-soft transition-colors"
							style={{ color: "var(--color-text)" }}
						></button>
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

					<Link href="/documentation/groups">
						<button
							className="px-4 py-2 bg-accent-button text-button-text rounded-lg font-semibold hover:bg-accent-button-hover transition-colors"
							style={{ color: "var(--color-text)" }}
						>
							Groups
						</button>
					</Link>
				</div>
			</section>

			{/* OVERVIEW */}
			<Section title="Overview">
				<div className="max-w-3xl space-y-4 text-text-muted leading-relaxed">
					<p>
						Accounts are needed to ensure that all players and
						matches are real. They are shared between PingElo and
						LittleFlows, our social media platform, for easier
						integration. LittleFlows is still in development.
					</p>
					<p>
						All useage data is kept private to third partes. Some
						anonymous data may be used in future to guide updates.
						Like supporting more languages when needed.
					</p>
				</div>
			</Section>

			{/* ACCOUNT CREATION*/}
			<Section title="Account Creation">
				<div className="grid md:grid-cols-3 gap-6">
					<Card>
						<h3 className="font-semibold">1. Validation</h3>
						<ul className="list-disc pl-5 text-text-muted space-y-1">
							<li>
								Details are input on the{" "}
								<Link
									href="/account/signup"
									className="underline hover:text-text transition"
								>
									Sign Up
								</Link>{" "}
								page
							</li>
							<li>Fields are checked for validity</li>
							<li>An appropriate message is shown</li>
						</ul>
					</Card>

					<Card>
						<h3 className="font-semibold">2. Account Creation</h3>
						<ul className="list-disc pl-5 text-text-muted space-y-1">
							<li>A request is sent to supabase</li>
							<li>Account creation is triggered</li>
							<li>The id is added to pe_account_id</li>
						</ul>
					</Card>

					<Card>
						<h3 className="font-semibold">3. Player Creation</h3>
						<ul className="list-disc pl-5 text-text-muted space-y-1">
							<li>Account creation is checked</li>
							<li>The player is created and linked</li>
							<li>The user is sent to their profile</li>
						</ul>
					</Card>
				</div>
			</Section>

			{/* ACCOUNT ACTIONS */}
			<Section title="Account Actions">
				<div className="max-w-3xl space-y-4 text-text-muted leading-relaxed">
					<p>
						With the release of dashboard we will be adding account
						customisation so you can change your player name and
						more. Accounts will get more features as LittleFlows is
						developed further.
					</p>
					<p>
						Currently we do not have a frontend for account recovery
						and account deletion. If you need either of these please{" "}
						<Link
							href="/contact"
							className="underline hover:text-text transition"
						>
							contact
						</Link>{" "}
						us. These pages will be developed and created in future.
					</p>
				</div>
			</Section>

			{/* OUR POLICY */}
			<Section title="Our Policy">
				<div className="max-w-3xl space-y-4 text-text-muted leading-relaxed">
					<p>
						Rules are set by the group or tournament owner as
						detailed before. However, we reserve the right to delete
						or ban accounts when needed. Falsifying matches, toxic
						behaviour and lack of common sense is not taken lightly.
					</p>
					<p>
						This is ping pong; it is not hard to follow the rules.
						If you believe someone is breaking the rules please{" "}
						<Link
							href="/report"
							className="underline hover:text-text transition"
						>
							report
						</Link>{" "}
						them. This feature is not complete yet.
					</p>
				</div>
			</Section>

			{/* CONTACT */}
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
