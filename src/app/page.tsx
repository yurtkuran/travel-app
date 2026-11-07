import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-10 py-8">
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-6">
        <Link className="text-2xl font-semibold tracking-tight" href="/">
          TravelTrove
        </Link>
        <nav aria-label="Primary navigation">
          <ul className="flex list-none gap-8 p-0 text-sm font-medium">
            <li>
              <a href="#places">Places</a>
            </li>
            <li>
              <a href="#about">About</a>
            </li>
          </ul>
        </nav>
      </header>

      <section
        className="flex flex-1 items-center py-24"
        aria-labelledby="page-title"
      >
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-semibold tracking-[0.16em] text-[var(--accent)] uppercase">
            The new foundation
          </p>
          <h1
            id="page-title"
            className="text-6xl leading-[1.05] font-semibold tracking-[-0.04em]"
          >
            Keep track of places worth returning to.
          </h1>
          <p className="mt-8 max-w-2xl text-xl leading-8 text-[var(--muted)]">
            TravelTrove is being built as a thoughtful, curated home for
            destinations, visits, and reviews. The first production feature will
            arrive on this tested foundation.
          </p>
          <div className="mt-10 flex gap-4">
            <a
              className="rounded-md bg-[var(--accent)] px-5 py-3 font-semibold text-white hover:bg-[var(--accent-strong)]"
              href="#places"
            >
              Explore the foundation
            </a>
            <Link
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-5 py-3 font-semibold"
              href="/health/live"
            >
              Service status
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
