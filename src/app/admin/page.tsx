import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import {
  getAdministrationDashboard,
  type DashboardActivityItem,
  type DashboardQueueItem,
} from "@/features/admin/server/dashboard";
import { requireAdminSession } from "@/features/auth/server/session";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function typeLabel(type: DashboardQueueItem["type"]) {
  if (type === "proposal") return "Change proposal";
  if (type === "review") return "Hidden review";
  return "Place submission";
}

function actionLabel(action: string) {
  return action.replaceAll(".", " · ").replaceAll("_", " ");
}

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const dashboard = await getAdministrationDashboard(session.actor);

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
        <Link className="metric-card" href="/admin/submissions">
          <p className="eyebrow">New places</p>
          <p className="metric-card__value">
            {dashboard.counts.pendingSubmissions}
          </p>
          <p className="metric-card__label">Pending submissions</p>
        </Link>
        <Link className="metric-card" href="/admin/proposals">
          <p className="eyebrow">Published places</p>
          <p className="metric-card__value">
            {dashboard.counts.pendingProposals}
          </p>
          <p className="metric-card__label">Change proposals</p>
        </Link>
        <Link className="metric-card" href="/admin/reviews">
          <p className="eyebrow">Community</p>
          <p className="metric-card__value">{dashboard.counts.hiddenReviews}</p>
          <p className="metric-card__label">Hidden reviews</p>
        </Link>
      </section>
      <section className="dashboard-section">
        <div className="dashboard-section__heading">
          <div>
            <p className="eyebrow">Operational overview</p>
            <h2>Needs attention</h2>
          </div>
          <p>Oldest moderation work appears first.</p>
        </div>
        {dashboard.queue.length ? (
          <DataTable<DashboardQueueItem>
            caption="Moderation work needing attention"
            columns={[
              {
                header: "Type",
                key: "type",
                render: (item) => typeLabel(item.type),
              },
              {
                header: "Subject",
                key: "subject",
                render: (item) => item.subject,
              },
              {
                header: "Submitted by",
                key: "actor",
                render: (item) => item.actorName ?? "Deleted user",
              },
              {
                header: "Waiting since",
                key: "created",
                render: (item) => formatDate(item.createdAt),
              },
              {
                align: "end",
                header: "Action",
                key: "action",
                render: (item) => (
                  <Link className="button-secondary" href={item.href}>
                    {item.actionLabel}
                  </Link>
                ),
              },
            ]}
            getRowKey={(item) => `${item.type}-${item.id}`}
            rows={dashboard.queue}
          />
        ) : (
          <EmptyState
            description="New submissions, change proposals, and hidden reviews will appear here."
            eyebrow="Queue clear"
            title="No work waiting"
          />
        )}
      </section>
      <section className="dashboard-section">
        <div className="dashboard-section__heading">
          <div>
            <p className="eyebrow">Security record</p>
            <h2>Recent administrative activity</h2>
          </div>
          <Link className="button-ghost" href="/admin/audit">
            View audit log
          </Link>
        </div>
        {dashboard.activity.length ? (
          <DataTable<DashboardActivityItem>
            caption="Recent administrative activity"
            columns={[
              {
                header: "When",
                key: "when",
                render: (item) => formatDate(item.createdAt),
              },
              {
                header: "Actor",
                key: "actor",
                render: (item) =>
                  item.actorType === "system"
                    ? "System"
                    : (item.actorName ?? "Deleted user"),
              },
              {
                header: "Action",
                key: "action",
                render: (item) => actionLabel(item.action),
              },
              {
                header: "Target",
                key: "targetType",
                render: (item) => item.targetType,
              },
            ]}
            getRowKey={(item) => item.id}
            rows={dashboard.activity}
          />
        ) : (
          <EmptyState
            description="Security-relevant actions will appear here without exposing private payloads."
            title="No administrative activity"
          />
        )}
      </section>
    </>
  );
}
