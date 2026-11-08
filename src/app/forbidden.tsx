import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="system-state">
      <div className="system-state__content">
        <p className="eyebrow">403 · Protected area</p>
        <h1>Access denied</h1>
        <p>Your account does not have permission to access this area.</p>
        <div className="system-state__actions">
          <Link className="button-primary" href="/my">
            Open my activity
          </Link>
          <Link className="button-secondary" href="/">
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
