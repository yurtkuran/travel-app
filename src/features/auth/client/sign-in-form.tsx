"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "./auth-client";

export function SignInForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });

    if (result.error) {
      setError("The email address or password is incorrect.");
      setPending(false);
      return;
    }

    router.push(returnTo);
    router.refresh();
  }

  return (
    <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
      {error ? (
        <div
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <div>
        <label className="block text-sm font-semibold" htmlFor="email">
          Email address
        </label>
        <input
          autoComplete="email"
          className="mt-2 w-full rounded-md border border-[var(--border)] bg-white px-4 py-3"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="mt-2 w-full rounded-md border border-[var(--border)] bg-white px-4 py-3"
          id="password"
          minLength={12}
          name="password"
          required
          type="password"
        />
      </div>
      <button
        className="w-full rounded-md bg-[var(--accent)] px-5 py-3 font-semibold text-white disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
