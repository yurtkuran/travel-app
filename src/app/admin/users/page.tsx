import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { PageHeading } from "@/components/ui/page-heading";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { listAdminUsers } from "@/features/auth/server/administration-queries";
import { requireAdminSession } from "@/features/auth/server/session";

function queryValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    deleted?: string | string[];
    page?: string | string[];
    q?: string | string[];
    status?: string | string[];
  }>;
}) {
  const session = await requireAdminSession();
  const query = await searchParams;
  const result = await listAdminUsers(session.actor, {
    page: queryValue(query.page),
    q: queryValue(query.q),
    status: queryValue(query.status) as
      "active" | "all" | "pending" | "suspended" | undefined,
  });
  return (
    <>
      <PageHeading
        action={
          <Link className="button-primary" href="/admin/users/new">
            Provision user
          </Link>
        }
        description="Provision invitation-only accounts, suspend access, and manage roles with final-administrator safeguards."
        eyebrow="Access management"
        title="Manage users"
      />
      {query.deleted === "true" ? (
        <div className="content-feedback">
          <FeedbackBanner tone="success">
            The account and its private activity were deleted according to the
            retention policy.
          </FeedbackBanner>
        </div>
      ) : null}
      <form className="list-toolbar management-toolbar">
        <div className="form-field">
          <label htmlFor="user-search">Search users</label>
          <input
            defaultValue={result.input.q}
            id="user-search"
            name="q"
            placeholder="Name or email"
            type="search"
          />
        </div>
        <div className="form-field">
          <label htmlFor="user-status">Status</label>
          <select
            defaultValue={result.input.status}
            id="user-status"
            name="status"
          >
            <option value="all">All accounts</option>
            <option value="active">Active</option>
            <option value="pending">Setup pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <button className="button-secondary" type="submit">
          Apply
        </button>
        <Link className="button-ghost" href="/admin/users">
          Clear
        </Link>
      </form>
      {result.items.length ? (
        <>
          <DataTable
            caption="Provisioned user accounts"
            columns={[
              {
                header: "Account",
                key: "account",
                render: (user) => (
                  <div className="table-primary-cell">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                ),
              },
              { header: "Role", key: "role", render: (user) => user.role },
              {
                header: "Status",
                key: "status",
                render: (user) => (
                  <StatusBadge
                    tone={
                      user.status === "active"
                        ? "positive"
                        : user.status === "suspended"
                          ? "critical"
                          : "warning"
                    }
                  >
                    {user.status === "pending" ? "Setup pending" : user.status}
                  </StatusBadge>
                ),
              },
              {
                align: "end",
                header: "Action",
                key: "action",
                render: (user) => (
                  <Link
                    className="button-secondary"
                    href={`/admin/users/${user.id}`}
                  >
                    Manage
                  </Link>
                ),
              },
            ]}
            getRowKey={(user) => user.id}
            rows={result.items}
          />
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            pathname="/admin/users"
            query={{
              q: result.input.q,
              status:
                result.input.status === "all" ? undefined : result.input.status,
            }}
            total={result.total}
          />
        </>
      ) : (
        <EmptyState
          description="Try clearing the current search or status filter."
          eyebrow="No matching accounts"
          title="No users found"
        />
      )}
    </>
  );
}
