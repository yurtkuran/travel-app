import Link from "next/link";

import { AuthShell } from "@/components/shell/auth-shell";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { SignInForm } from "@/features/auth/client/sign-in-form";
import { safeReturnPath } from "@/features/auth/return-path";
import { getCurrentSession } from "@/features/auth/server/session";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    fresh?: string | string[];
    returnTo?: string | string[];
    setup?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnPath(params.returnTo);
  const session = await getCurrentSession();
  const freshRequired = params.fresh === "required";

  return (
    <AuthShell
      description="Access is limited to accounts provisioned by a TravelTrove administrator."
      eyebrow="Welcome back"
      title="Sign in"
    >
      {params.setup === "complete" ? (
        <div className="mt-6">
          <FeedbackBanner tone="success">
            Your account is ready. Sign in with your new password.
          </FeedbackBanner>
        </div>
      ) : null}
      {freshRequired && session ? (
        <div className="mt-6">
          <FeedbackBanner title="Confirm your identity" tone="warning">
            Sign in again before performing this sensitive administrative
            action.
          </FeedbackBanner>
        </div>
      ) : null}
      {session && !freshRequired ? (
        <div className="notice-panel">
          <p>You are already signed in as {session.email}.</p>
          <Link className="button-primary mt-4" href={returnTo}>
            Continue
          </Link>
        </div>
      ) : (
        <SignInForm initialEmail={session?.email} returnTo={returnTo} />
      )}
    </AuthShell>
  );
}
