"use client";

import { useEffect, useRef, useState } from "react";

import { completeAccountSetup } from "./actions";

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function SetupForm({
  serverRejected = false,
}: {
  serverRejected?: boolean;
}) {
  const [token, setToken] = useState<string | null>();
  const capturedToken = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (capturedToken.current === undefined) {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const candidate = fragment.get("token") ?? "";
      capturedToken.current = tokenPattern.test(candidate) ? candidate : null;
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }

    const frame = window.requestAnimationFrame(() =>
      setToken(capturedToken.current ?? null),
    );
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (serverRejected || token === null) {
    return (
      <div className="alert-error mt-8" role="alert">
        This setup link is invalid or has expired. Ask an administrator to
        generate a new link.
      </div>
    );
  }

  if (token === undefined) {
    return (
      <div aria-live="polite" className="notice-panel">
        Preparing secure account setup…
      </div>
    );
  }

  return (
    <form action={completeAccountSetup} className="form-stack">
      <input name="token" type="hidden" value={token} />
      <p className="text-[var(--muted)]">
        Choose a password of at least 12 characters.
      </p>
      <div className="form-field">
        <label htmlFor="password">Password</label>
        <input
          autoComplete="new-password"
          id="password"
          maxLength={128}
          minLength={12}
          name="password"
          required
          type="password"
        />
      </div>
      <div className="form-field">
        <label htmlFor="passwordConfirmation">Confirm password</label>
        <input
          autoComplete="new-password"
          id="passwordConfirmation"
          maxLength={128}
          minLength={12}
          name="passwordConfirmation"
          required
          type="password"
        />
      </div>
      <button className="button-primary w-full" type="submit">
        Complete account setup
      </button>
    </form>
  );
}
