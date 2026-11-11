import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { Pagination } from "@/components/ui/pagination";
import { listAuditEvents } from "@/features/auth/server/administration-queries";
import { requireAdminSession } from "@/features/auth/server/session";

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input : undefined;
}

function formatDate(input: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(input));
}

function actionLabel(action: string) {
  return action.replaceAll(".", " · ").replaceAll("_", " ");
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
  }>;
}) {
  const session = await requireAdminSession();
  const query = await searchParams;
  const result = await listAuditEvents(session.actor, {
    page: value(query.page),
    q: value(query.q),
  });
  return (
    <>
      <PageHeading
        description="Review redacted, security-relevant administrative events in a read-only record. Tokens, credentials, IP addresses, and private activity are never displayed."
        eyebrow="Security record"
        title="Audit log"
      />
      <form className="list-toolbar management-toolbar">
        <div className="form-field">
          <label htmlFor="audit-search">Search audit events</label>
          <input
            defaultValue={result.input.q}
            id="audit-search"
            name="q"
            placeholder="Action, target, or actor"
            type="search"
          />
        </div>
        <button className="button-secondary" type="submit">
          Search
        </button>
        <Link className="button-ghost" href="/admin/audit">
          Clear
        </Link>
      </form>
      {result.items.length ? (
        <>
          <DataTable
            caption="Administrative audit events"
            columns={[
              {
                header: "When",
                key: "when",
                render: (event) => formatDate(event.createdAt),
              },
              {
                header: "Actor",
                key: "actor",
                render: (event) =>
                  event.actorType === "system"
                    ? "System"
                    : (event.actorName ?? "Deleted user"),
              },
              {
                header: "Action",
                key: "action",
                render: (event) => actionLabel(event.action),
              },
              {
                header: "Target",
                key: "target",
                render: (event) => (
                  <div className="table-primary-cell">
                    <strong>{event.targetType}</strong>
                    <span>{event.targetId ?? "No identifier"}</span>
                  </div>
                ),
              },
            ]}
            getRowKey={(event) => event.id}
            rows={result.items}
          />
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            pathname="/admin/audit"
            query={{ q: result.input.q }}
            total={result.total}
          />
        </>
      ) : (
        <EmptyState
          description="Provisioning, recovery, suspension, and moderation events will appear here."
          title="No audit events"
        />
      )}
    </>
  );
}
