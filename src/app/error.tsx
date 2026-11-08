"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="system-state">
      <div className="system-state__content">
        <p className="eyebrow">Something went wrong</p>
        <h1>We could not open this part of the archive.</h1>
        <p>
          The problem may be temporary. Try again without losing your place.
        </p>
        <div className="system-state__actions">
          <button className="button-primary" onClick={reset} type="button">
            Try again
          </button>
          <Link className="button-secondary" href="/">
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
