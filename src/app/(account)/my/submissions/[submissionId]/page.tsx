import { ShellPage } from "@/components/ui/shell-page";

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  return (
    <ShellPage
      description="Inspect an owned draft or its current moderation status without exposing another contributor's private provenance."
      emptyDescription={`Submission ${submissionId} will load here once the workflow is connected.`}
      emptyTitle="Submission details unavailable"
      eyebrow="Contribution workspace"
      title="Place submission"
    />
  );
}
