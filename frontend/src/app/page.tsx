import Link from "next/link";

//Function for displaying features
function Feature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl p-6 space-y-2">
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

//Displays home page. Optimized for SEO
export default function HomePage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-16 space-y-16">
      {/* HERO */}
      <section className="text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Competitive Ping Pong Elo Rankings
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Track matches, climb the leaderboard, play tournaments, and find our who is best.
          PingElo uses an Elo system based on point different, elo difference and length of game.
        </p>

        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/leaderboard"
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 transition font-semibold"
          >
            View Leaderboard
          </Link>

          <Link
            href="/matches/submit"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition font-semibold"
          >
            Submit a Match
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="grid md:grid-cols-3 gap-6">
        <Feature
          title="Elo-Based Rankings"
          description="Every match updates player ratings using a fair, point aware Elo algorithm."
        />
        <Feature
          title="Public Profiles"
          description="View match history, Elo progression, and win / loss stats for every player."
        />
        <Feature
          title="Match History"
          description="Every match is recorded, numbered, and permanently viewable."
        />
      </section>

      {/* CTA */}
      <section className="bg-black/40 border border-white/10 rounded-2xl p-10 text-center space-y-4">
        <h2 className="text-2xl font-bold">
          Ready to compete?
        </h2>
        <p className="text-gray-400">
          Sign in, submit matches, and start climbing.
        </p>
        <Link
          href="/signin"
          className="inline-block mt-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 transition font-semibold"
        >
          Sign In
        </Link>
      </section>
    </main>
  );
}