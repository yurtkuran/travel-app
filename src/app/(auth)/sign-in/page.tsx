import Link from "next/link";

import { SignInForm } from "@/features/auth/client/sign-in-form";
import { safeReturnPath } from "@/features/auth/return-path";
import { getCurrentSession } from "@/features/auth/server/session";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    returnTo?: string | string[];
    setup?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnPath(params.returnTo);
  const session = await getCurrentSession();

  return (
    <main className="mx-auto min-h-screen max-w-lg px-10 py-20">
      <Link className="text-2xl font-semibold tracking-tight" href="/">
        TravelTrove
      </Link>
      <h1 className="mt-16 text-4xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-4 text-[var(--muted)]">
        Access is currently limited to accounts provisioned by an administrator.
      </p>
      {params.setup === "complete" ? (
        <p
          className="mt-6 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900"
          role="status"
        >
          Your account is ready. Sign in with your new password.
        </p>
      ) : null}
      {session ? (
        <div className="mt-10 rounded-md border border-[var(--border)] bg-white p-5">
          <p>You are already signed in as {session.email}.</p>
          <Link
            className="mt-3 inline-block font-semibold text-[var(--accent)]"
            href={returnTo}
          >
            Continue
          </Link>
        </div>
      ) : (
        <SignInForm returnTo={returnTo} />
      )}
    </main>
  );
}
