import Link from "next/link";

import { isSetupTokenUsable } from "@/features/auth/server/setup-tokens";

import { completeAccountSetup } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  referrer: "no-referrer" as const,
  robots: { index: false, follow: false },
  title: "Set up your account",
};

export default async function CompleteAccountSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";
  const hasUsableToken = !params.error && (await isSetupTokenUsable(token));

  return (
    <main className="mx-auto min-h-screen max-w-lg px-10 py-20">
      <Link className="text-2xl font-semibold tracking-tight" href="/">
        TravelTrove
      </Link>
      <h1 className="mt-16 text-4xl font-semibold tracking-tight">
        Set up your account
      </h1>
      {!hasUsableToken ? (
        <div
          className="mt-8 rounded-md border border-red-300 bg-red-50 p-5 text-red-900"
          role="alert"
        >
          This setup link is invalid or has expired. Ask an administrator to
          generate a new link.
        </div>
      ) : (
        <form action={completeAccountSetup} className="mt-10 space-y-6">
          <input name="token" type="hidden" value={token} />
          <p className="text-[var(--muted)]">
            Choose a password of at least 12 characters.
          </p>
          <div>
            <label className="block text-sm font-semibold" htmlFor="password">
              Password
            </label>
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-md border border-[var(--border)] bg-white px-4 py-3"
              id="password"
              maxLength={128}
              minLength={12}
              name="password"
              required
              type="password"
            />
          </div>
          <div>
            <label
              className="block text-sm font-semibold"
              htmlFor="passwordConfirmation"
            >
              Confirm password
            </label>
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-md border border-[var(--border)] bg-white px-4 py-3"
              id="passwordConfirmation"
              maxLength={128}
              minLength={12}
              name="passwordConfirmation"
              required
              type="password"
            />
          </div>
          <button
            className="w-full rounded-md bg-[var(--accent)] px-5 py-3 font-semibold text-white"
            type="submit"
          >
            Complete account setup
          </button>
        </form>
      )}
    </main>
  );
}
