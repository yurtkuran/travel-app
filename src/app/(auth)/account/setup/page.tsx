import { AuthShell } from "@/components/shell/auth-shell";

import { SetupForm } from "./setup-form";

export const metadata = {
  referrer: "no-referrer" as const,
  robots: { index: false, follow: false },
  title: "Set up your account",
};

export default async function AccountSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell
      description="Choose a secure password to activate the account your administrator prepared for you."
      eyebrow="Invitation accepted"
      title="Set up your account"
    >
      <SetupForm serverRejected={params.error === "invalid"} />
    </AuthShell>
  );
}
