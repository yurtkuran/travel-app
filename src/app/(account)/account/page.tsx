import Link from "next/link";

import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { PageHeading } from "@/components/ui/page-heading";
import { requireCurrentSession } from "@/features/auth/server/session";

import { updateProfileAction } from "./actions";

function value(input: string | string[] | undefined) {
  return typeof input === "string" ? input : undefined;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    updated?: string | string[];
  }>;
}) {
  const [session, query] = await Promise.all([
    requireCurrentSession("/account"),
    searchParams,
  ]);
  const error = value(query.error);
  return (
    <>
      <PageHeading
        action={
          <Link className="button-secondary" href="/account/security">
            Password and sessions
          </Link>
        }
        description="Keep the name associated with your invitation-only TravelTrove account current. Your email address can be changed only through an administrator-assisted account review."
        eyebrow="Account"
        title="Your profile"
      />
      {query.updated === "true" ? (
        <FeedbackBanner tone="success">
          Your profile was updated.
        </FeedbackBanner>
      ) : null}
      {error ? (
        <FeedbackBanner tone="error">
          {error === "invalid"
            ? "Enter a name between 1 and 160 characters."
            : "Your profile could not be updated."}
        </FeedbackBanner>
      ) : null}
      <section className="account-settings-section">
        <div>
          <p className="eyebrow">Profile details</p>
          <h2>How you appear</h2>
          <p>
            This name appears beside your public reviews and administrative
            activity where applicable.
          </p>
        </div>
        <form action={updateProfileAction} className="form-stack settings-form">
          <div className="form-field">
            <label htmlFor="profile-name">Name</label>
            <input
              defaultValue={session.name}
              id="profile-name"
              maxLength={160}
              name="name"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="profile-email">Email address</label>
            <input
              aria-describedby="profile-email-help"
              disabled
              id="profile-email"
              type="email"
              value={session.email}
            />
            <p className="field-help" id="profile-email-help">
              Contact an administrator if this address must change.
            </p>
          </div>
          <button className="button-primary" type="submit">
            Save profile
          </button>
        </form>
      </section>
    </>
  );
}
