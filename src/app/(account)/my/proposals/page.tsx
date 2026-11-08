import { ShellPage } from "@/components/ui/shell-page";

export default function ProposalsPage() {
  return (
    <ShellPage
      description="Track the edits you have suggested to published places and the administrator's decision on each proposal."
      emptyDescription="Suggested edits will appear here after you propose a change from a published place."
      emptyTitle="No proposed edits"
      eyebrow="Contribution workspace"
      title="Your proposed edits"
    />
  );
}
