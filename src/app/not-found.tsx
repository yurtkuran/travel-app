import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="system-state">
      <div className="system-state__content">
        <p className="eyebrow">404 · Not found</p>
        <h1>This place is not in the archive.</h1>
        <p>
          The address may be outdated, or the entry may not be published for
          public viewing.
        </p>
        <div className="system-state__actions">
          <Link className="button-primary" href="/places">
            Explore places
          </Link>
          <Link className="button-secondary" href="/">
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
