import { ShellPage } from "@/components/ui/shell-page";

export default function AccountSecurityPage() {
  return (
    <ShellPage
      description="Change your password and review only the sessions belonging to your own account."
      emptyDescription="Password and session-management controls will use Better Auth's server-enforced owner boundaries."
      emptyTitle="No security action required"
      eyebrow="Account security"
      title="Password and sessions"
    />
  );
}
