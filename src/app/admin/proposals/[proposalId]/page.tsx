import { AdminShellPage } from "@/components/ui/admin-shell-page";

export default async function AdminProposalPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  return (
    <AdminShellPage
      description="Compare current and proposed values, detect stale canonical data, and approve or reject the change."
      emptyDescription={`Proposal ${proposalId} will load here when comparison queries are connected.`}
      emptyTitle="Proposal unavailable"
      eyebrow="Moderation review"
      title="Compare proposed changes"
    />
  );
}
