import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto max-w-3xl px-10 py-24">
      <p className="text-sm font-semibold tracking-[0.16em] text-[var(--accent)] uppercase">
        403
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">
        Access denied
      </h1>
      <p className="mt-5 text-lg text-[var(--muted)]">
        Your account does not have permission to access this area.
      </p>
      <Link
        className="mt-8 inline-block font-semibold text-[var(--accent)]"
        href="/"
      >
        Return to TravelTrove
      </Link>
    </main>
  );
}
