import Link from "next/link";

import { PageHeading } from "@/components/ui/page-heading";
import { requireAdminSession } from "@/features/auth/server/session";

export default async function AdminDashboardPage() {
  await requireAdminSession();

  return (
    <>
      <PageHeading
        action={
          <Link className="button-primary" href="/admin/places/new">
            Add place
          </Link>
        }
        description="Review the repository, moderate contributions, and manage the people and taxonomy that keep TravelTrove useful."
        eyebrow="Administration"
        title="Admin dashboard"
      />
      <section aria-label="Administration summary" className="metric-grid">
        <article className="metric-card">
          <p className="eyebrow">Repository</p>
          <p className="metric-card__value">—</p>
          <p className="metric-card__label">Published places</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Moderation</p>
          <p className="metric-card__value">—</p>
          <p className="metric-card__label">Pending submissions</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Community</p>
          <p className="metric-card__value">—</p>
          <p className="metric-card__label">Active accounts</p>
        </article>
      </section>
      <section className="empty-state">
        <div>
          <p className="eyebrow">Operational overview</p>
          <h2>No work waiting</h2>
          <p>
            Moderation queues and repository activity will appear here as the
            first places and contributions are created.
          </p>
        </div>
      </section>
    </>
  );
}
