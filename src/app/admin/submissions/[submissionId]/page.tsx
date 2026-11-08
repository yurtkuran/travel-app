import { AdminShellPage } from "@/components/ui/admin-shell-page";

export default async function AdminSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  return (
    <AdminShellPage
      description="Compare the submitted place with repository requirements and record an explicit moderation decision."
      emptyDescription={`Submission ${submissionId} will load here when moderation queries are connected.`}
      emptyTitle="Submission unavailable"
      eyebrow="Moderation review"
      title="Review submission"
    />
  );
}
