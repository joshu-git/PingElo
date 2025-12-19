import Link from "next/link";

//Feature card
function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-card p-6 space-y-2 transition hover:shadow-lg hover:-translate-y-1">
      <h3 className="font-semibold text-lg text-text">{title}</h3>
      <p className="text-sm text-text-muted">{description}</p>
    </div>
  );
}

//Quick Stats
function QuickStats() {
  const stats = [
    { label: "Matches", value: 470 },
    { label: "Players", value: 17 },
    { label: "Groups", value: 1 },
  ];

  return (
    <div className="flex justify-center gap-6 text-text-subtle text-sm md:text-base mt-2">
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-1">
          <span className="font-semibold">{stat.value}</span>
          <span>{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

//Home Page
export default function HomePage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-16 space-y-16">
      {/* HERO */}
      <section className="text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Ping Pong Elo Rankings
        </h1>

        <p className="text-lg max-w-2xl mx-auto">
          Track matches, climb the leaderboard, and find out who is the best.
          PingElo uses a competitive Elo system based on point and Elo difference.
        </p>

        <QuickStats />

        <div className="flex justify-center gap-4 pt-4">
          <Link href="/leaderboard">
            <button className="px-6 py-3 rounded-xl">
              View Leaderboard
            </button>
          </Link>

          <Link href="/matches/submit">
            <button className="px-6 py-3 rounded-xl">
              Submit A Match
            </button>
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section aria-labelledby="features-heading" className="grid md:grid-cols-3 gap-6">
        <h2 id="features-heading" className="sr-only">
          Features
        </h2>

        <Feature title="Elo Based Rankings" description="Every match updates player ratings using a fair Elo algorithm." />
        <Feature title="Public Profiles" description="View match history, Elo progression, and stats for every player." />
        <Feature title="Match History" description="Every match is recorded, numbered, and permanently viewable." />
      </section>

      {/* CTA */}
      <section className="bg-card p-10 text-center space-y-4">
        <h2 className="text-2xl font-bold">Ready to compete?</h2>
        <p>Sign in, submit matches, and start climbing.</p>

        <Link href="/account/signin">
          <button className="mt-2 px-6 py-3 rounded-xl">
            Sign In
          </button>
        </Link>
      </section>

      {/* DONORS */}
      <section className="bg-card p-10 text-center space-y-6">
        <h2 className="text-xl font-semibold">Special Thanks</h2>

        <div className="bg-card-donor p-6 rounded-xl space-y-3 max-w-xl mx-auto">
          <p className="font-medium text-lg">Collingwood College</p>
          <p className="text-sm">
            Donated a new net and paddles.<br />
            Your support has made matches much more fun!
          </p>
          <a
            href="https://collingwoodcollege.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Website
          </a>
        </div>
      </section>
    </main>
  );
}