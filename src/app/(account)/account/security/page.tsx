import Link from "next/link";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { PageHeading } from "@/components/ui/page-heading";
import { listOwnSessions } from "@/features/auth/server/account-self-service";
import { requireCurrentSession } from "@/features/auth/server/session";

import { changePasswordAction, revokeSessionAction } from "../actions";

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input : undefined;
}

function formatDate(input: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(input));
}

function sessionLabel(userAgent: string | null, isCurrent: boolean) {
  if (isCurrent) return "Current browser";
  if (!userAgent) return "Browser session";
  if (/edg/i.test(userAgent)) return "Microsoft Edge";
  if (/chrome|chromium/i.test(userAgent)) return "Chrome browser";
  if (/firefox/i.test(userAgent)) return "Firefox browser";
  if (/safari/i.test(userAgent)) return "Safari browser";
  return userAgent.slice(0, 80);
}

export default async function AccountSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    updated?: string | string[];
  }>;
}) {
  const [session, query] = await Promise.all([
    requireCurrentSession("/account/security"),
    searchParams,
  ]);
  const sessions = await listOwnSessions(session.actor, session.sessionId);
  const error = value(query.error);
  const updated = value(query.updated);
  return (
    <>
      <PageHeading
        action={
          <Link className="button-secondary" href="/account">
            Profile
          </Link>
        }
        description="Change your password and review only the active sessions belonging to your account. Password changes end every other session."
        eyebrow="Account security"
        title="Password and sessions"
      />
      {updated ? (
        <FeedbackBanner tone="success">
          {updated === "password"
            ? "Your password was changed and other sessions were ended."
            : "The selected session was ended."}
        </FeedbackBanner>
      ) : null}
      {error ? (
        <FeedbackBanner tone="error">
          {error === "incorrect"
            ? "The current password is incorrect."
            : error === "invalid"
              ? "Use a 12–128 character password and enter it the same way twice."
              : error === "session"
                ? "That session could not be ended."
                : "The security update could not be completed."}
        </FeedbackBanner>
      ) : null}
      <section className="account-settings-section">
        <div>
          <p className="eyebrow">Password</p>
          <h2>Choose a new password</h2>
          <p>
            Confirm your current password. Other browsers will need to sign in
            again after this change.
          </p>
        </div>
        <form
          action={changePasswordAction}
          className="form-stack settings-form"
        >
          <div className="form-field">
            <label htmlFor="current-password">Current password</label>
            <input
              autoComplete="current-password"
              id="current-password"
              maxLength={128}
              name="currentPassword"
              required
              type="password"
            />
          </div>
          <div className="form-field">
            <label htmlFor="new-password">New password</label>
            <input
              autoComplete="new-password"
              id="new-password"
              maxLength={128}
              minLength={12}
              name="newPassword"
              required
              type="password"
            />
          </div>
          <div className="form-field">
            <label htmlFor="password-confirmation">Confirm new password</label>
            <input
              autoComplete="new-password"
              id="password-confirmation"
              maxLength={128}
              minLength={12}
              name="confirmation"
              required
              type="password"
            />
          </div>
          <button className="button-primary" type="submit">
            Change password
          </button>
        </form>
      </section>
      <section className="account-settings-section account-session-section">
        <div>
          <p className="eyebrow">Active sessions</p>
          <h2>Browsers signed in</h2>
          <p>
            Session tokens are never displayed. End any browser session you no
            longer recognize.
          </p>
        </div>
        <div className="session-list">
          {sessions.map((item) => (
            <article className="session-card" key={item.id}>
              <div>
                <div className="session-card__title">
                  <strong>
                    {sessionLabel(item.userAgent, item.isCurrent)}
                  </strong>
                  {item.isCurrent ? (
                    <span className="status-pill">Current</span>
                  ) : null}
                </div>
                <p>Last active {formatDate(item.updatedAt)}</p>
                <p>
                  Started {formatDate(item.createdAt)} · Expires{" "}
                  {formatDate(item.expiresAt)}
                </p>
                {item.ipAddress ? <p>IP address {item.ipAddress}</p> : null}
              </div>
              {item.isCurrent ? (
                <p className="field-help">Use the account menu to sign out.</p>
              ) : (
                <form action={revokeSessionAction}>
                  <input name="sessionId" type="hidden" value={item.id} />
                  <button className="button-secondary" type="submit">
                    End session
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
