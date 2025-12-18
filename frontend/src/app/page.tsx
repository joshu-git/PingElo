import Link from "next/link";

//Feature card
function Feature({ title, description }: { title: string; description: string; }) {
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
    { label: "Matches Tracked", value: 470 },
    { label: "Players", value: 17 },
    { label: "Top 5 Updated Daily", value: "" },
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

//Home page
export default function HomePage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-16 space-y-16">

      {/* HERO */}
      <section className="text-center space-y-4 md:space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text">
          Ping Pong Elo Rankings
        </h1>

        <p className="text-lg text-text-muted max-w-2xl mx-auto">
          Track matches, climb the leaderboard, and find out who is the best.
          PingElo uses a competitive Elo system based on point and Elo difference.
        </p>

        <QuickStats />

        <div className="flex justify-center gap-4 pt-4">
          <Link href="/leaderboard">
            <button className="px-6 py-3 bg-accent hover:bg-accent-hover rounded-xl font-semibold transition text-white">
              View Leaderboard
            </button>
          </Link>

          <Link href="/matches/submit">
            <button className="px-6 py-3 bg-accent hover:bg-accent-hover rounded-xl font-semibold transition text-white">
              Submit A Match
            </button>
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="grid md:grid-cols-3 gap-6">
        <Feature title="Elo Based Rankings" description="Every match updates player ratings using a fair Elo algorithm." />
        <Feature title="Public Profiles" description="View match history, Elo progression, and stats for every player." />
        <Feature title="Match History" description="Every match is recorded, numbered, and permanently viewable." />
      </section>

      {/* CTA */}
      <section className="bg-card p-10 text-center space-y-4">
        <h2 className="text-2xl font-bold text-text">Ready to compete?</h2>
        <p className="text-text-muted">
          Sign in, submit matches, and start climbing.
        </p>

        <Link href="/account/signin">
          <button className="mt-2 px-6 py-3 bg-accent hover:bg-accent-hover rounded-xl font-semibold transition text-white">
            Sign In
          </button>
        </Link>
      </section>

      {/* DONOR SECTION */}
      <section className="bg-card p-8 md:p-10 rounded-2xl text-center space-y-6 shadow-sm transition hover:shadow-md">
        <h3 className="text-xl font-semibold text-text">Special Thanks</h3>

        <div className="flex flex-col md:flex-row justify-center items-stretch gap-6 mt-6">
          {/* Single donor */}
          <div className="bg-card-soft-light dark:bg-card-soft p-5 rounded-xl flex flex-col items-center space-y-2 transition hover:shadow-lg max-w-xs w-full">
            <span className="text-text font-medium text-center">Collingwood College</span>
            <p className="text-text-muted text-sm md:text-base text-center">
              Donated a new net and paddles. Your support has made matches fair and fun!
            </p>
            <a
              href="https://collingwoodcollege.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover transition font-medium text-sm"
            >
              Visit Website
            </a>
          </div>

          {/* Future donors can be added here */}
        </div>
      </section>

    </main>
  );
}