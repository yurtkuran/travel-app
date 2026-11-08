import { ShellPage } from "@/components/ui/shell-page";

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  return (
    <ShellPage
      description="Review your proposed values, the canonical place values, and the current moderation decision."
      emptyDescription={`Proposal ${proposalId} will load here once the comparison workflow is connected.`}
      emptyTitle="Proposal details unavailable"
      eyebrow="Proposed edit"
      title="Change proposal"
    />
  );
}
