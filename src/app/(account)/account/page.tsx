import { ShellPage } from "@/components/ui/shell-page";

export default function AccountPage() {
  return (
    <ShellPage
      description="Review the name and profile information associated with your invitation-only TravelTrove account."
      emptyDescription="Profile editing will be connected to your account record during the core application work."
      emptyTitle="Profile details are ready to connect"
      eyebrow="Account"
      title="Your profile"
    />
  );
}
