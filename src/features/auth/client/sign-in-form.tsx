"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { authClient } from "./auth-client";

export function SignInForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setHydrated(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

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
    <form className="form-stack" onSubmit={handleSubmit}>
      {error ? (
        <div className="alert-error" role="alert">
          {error}
        </div>
      ) : null}
      <div className="form-field">
        <label htmlFor="email">Email address</label>
        <input
          autoComplete="email"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div className="form-field">
        <label htmlFor="password">Password</label>
        <input
          autoComplete="current-password"
          id="password"
          minLength={12}
          name="password"
          required
          type="password"
        />
      </div>
      <button
        className="button-primary w-full"
        disabled={!hydrated || pending}
        type="submit"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
