import { PageHeading } from "@/components/ui/page-heading";
import { requireCurrentSession } from "@/features/auth/server/session";

export default async function MyDashboardPage() {
  const session = await requireCurrentSession("/my");

  return (
    <>
      <PageHeading
        description="Your private visits, public reviews, and place contributions live together here. Administrators still see only their own personal history."
        eyebrow="My activity"
        title={`Welcome, ${session.name}`}
      />
      <section aria-label="Activity summary" className="metric-grid">
        <article className="metric-card">
          <p className="eyebrow">Private</p>
          <p className="metric-card__value">—</p>
          <p className="metric-card__label">Visits recorded</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Public</p>
          <p className="metric-card__value">—</p>
          <p className="metric-card__label">Reviews shared</p>
        </article>
        <article className="metric-card">
          <p className="eyebrow">Contributions</p>
          <p className="metric-card__value">—</p>
          <p className="metric-card__label">Places submitted</p>
        </article>
      </section>
      <section className="empty-state">
        <div>
          <p className="eyebrow">Your archive begins here</p>
          <h2>No activity yet</h2>
          <p>
            Visit history, reviews, and submissions will appear as you add them.
          </p>
        </div>
      </section>
    </>
  );
}
