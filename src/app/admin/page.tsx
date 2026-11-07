import Link from "next/link";

import { SignOutButton } from "@/features/auth/client/sign-out-button";
import { requireAdminSession } from "@/features/auth/server/session";

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-10 py-12">
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-6">
        <Link className="text-2xl font-semibold" href="/">
          TravelTrove
        </Link>
        <SignOutButton />
      </header>
      <p className="mt-16 text-sm font-semibold tracking-[0.16em] text-[var(--accent)] uppercase">
        Administration
      </p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight">
        Admin dashboard
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-[var(--muted)]">
        Signed in as {session.name}. Moderation queues and account management
        will be added to this protected shell in later phases.
      </p>
      <Link
        className="mt-8 inline-block font-semibold text-[var(--accent)]"
        href="/my"
      >
        View my private activity
      </Link>
    </main>
  );
}
