import Link from "next/link";

// Feature card
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

// Home page
export default function HomePage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-16 space-y-16">
      {/* HERO */}
      <section className="text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Ping Pong Elo Rankings
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Track matches, climb the leaderboard, and find out who is the best.
          PingElo uses a competitive elo system based on point and elo difference.
        </p>

        <div className="flex justify-center gap-4 pt-4">
          <Link href="/leaderboard">
            <button
              type="button"
              className="
                px-6 py-3
                bg-purple-600
                hover:bg-purple-700
                rounded-xl
                font-semibold
                transition
                text-white
              "
            >
              View Leaderboard
            </button>
          </Link>

          <Link href="/matches/submit">
            <button
              type="button"
              className="
                px-6 py-3
                bg-purple-600
                hover:bg-purple-700
                rounded-xl
                font-semibold
                transition
                text-white
              "
            >
              Submit A Match
            </button>
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="grid md:grid-cols-3 gap-6">
        <Feature
          title="Elo Based Rankings"
          description="Every match updates player ratings using a fair elo algorithm."
        />
        <Feature
          title="Public Profiles"
          description="View match history, elo progression, and stats for every player."
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

        <Link href="/signin">
          <button
            type="button"
            className="
              mt-2
              px-6 py-3
              bg-purple-600
              hover:bg-purple-700
              rounded-xl
              font-semibold
              transition
              text-white
            "
          >
            Sign In
          </button>
        </Link>
      </section>
    </main>
  );
}