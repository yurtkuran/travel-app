import Link from "next/link";

import { SignOutButton } from "@/features/auth/client/sign-out-button";
import { requireCurrentSession } from "@/features/auth/server/session";

export default async function MyDashboardPage() {
  const session = await requireCurrentSession("/my");

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-10 py-12">
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-6">
        <Link className="text-2xl font-semibold" href="/">
          TravelTrove
        </Link>
        <SignOutButton />
      </header>
      <p className="mt-16 text-sm font-semibold tracking-[0.16em] text-[var(--accent)] uppercase">
        My activity
      </p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight">
        Welcome, {session.name}
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-[var(--muted)]">
        Your private visits, reviews, and place submissions will appear here as
        those features are completed.
      </p>
      {session.actor.role === "admin" ? (
        <Link
          className="mt-8 inline-block font-semibold text-[var(--accent)]"
          href="/admin"
        >
          Open administration
        </Link>
      ) : null}
    </main>
  );
}
