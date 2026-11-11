import { notFound } from "next/navigation";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminUser } from "@/features/auth/server/administration-queries";
import { requireAdminSession } from "@/features/auth/server/session";

import { changeRoleAction } from "../actions";
import { DeleteUserDialog } from "./delete-dialog";
import { RecoveryControl } from "./recovery-control";
import { SuspensionControl } from "./suspension-dialog";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{
    error?: string | string[];
    updated?: string | string[];
  }>;
}) {
  const { userId } = await params;
  const session = await requireAdminSession();
  const user = await getAdminUser(session.actor, userId);
  if (!user) notFound();
  const query = await searchParams;
  const isSelf = session.actor.id === user.id;
  return (
    <>
      <PageHeading
        action={
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
        }
        description="Suspend, restore, delete, promote, or demote an account without exposing that person's private visits."
        eyebrow="Access management"
        title={user.name}
      />
      {typeof query.error === "string" ? (
        <div className="content-feedback">
          <FeedbackBanner tone="error">
            {query.error === "confirmation"
              ? "Type the account email address exactly to confirm deletion."
              : query.error}
          </FeedbackBanner>
        </div>
      ) : null}
      {typeof query.updated === "string" ? (
        <div className="content-feedback">
          <FeedbackBanner tone="success">
            The account was {query.updated} and its active sessions were revoked
            where required.
          </FeedbackBanner>
        </div>
      ) : null}
      <div className="detail-grid account-detail-grid">
        <section className="detail-panel">
          <p className="eyebrow">Identity</p>
          <h2>Account details</h2>
          <dl>
            <div className="detail-item">
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="detail-item">
              <dt>Role</dt>
              <dd>{user.role}</dd>
            </div>
            <div className="detail-item">
              <dt>Credential</dt>
              <dd>{user.activated ? "Activated" : "Setup pending"}</dd>
            </div>
            <div className="detail-item">
              <dt>Active sessions</dt>
              <dd>{user.sessionCount}</dd>
            </div>
            <div className="detail-item">
              <dt>Created</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
            {user.banReason ? (
              <div className="detail-item">
                <dt>Suspension reason</dt>
                <dd>{user.banReason}</dd>
              </div>
            ) : null}
          </dl>
        </section>
        <section className="detail-panel">
          <p className="eyebrow">Authorization</p>
          <h2>Role and access</h2>
          <form action={changeRoleAction} className="inline-management-form">
            <input name="userId" type="hidden" value={user.id} />
            <div className="form-field">
              <label htmlFor="account-role">Stored role</label>
              <select
                defaultValue={user.role}
                disabled={isSelf || user.banned}
                id="account-role"
                name="role"
              >
                <option value="user">User</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <button
              className="button-secondary"
              disabled={isSelf || user.banned}
              type="submit"
            >
              Update role
            </button>
          </form>
          <p className="field-help">
            Promotion requires an activated, unsuspended account. Role changes
            revoke existing sessions.
          </p>
          <div className="account-action-row">
            {isSelf ? (
              <p>
                You cannot suspend or delete your own administrator account.
              </p>
            ) : (
              <>
                <SuspensionControl
                  banned={user.banned}
                  name={user.name}
                  userId={user.id}
                />
                <DeleteUserDialog email={user.email} userId={user.id} />
              </>
            )}
          </div>
        </section>
      </div>
      {!user.banned ? (
        <RecoveryControl activated={user.activated} userId={user.id} />
      ) : null}
    </>
  );
}
