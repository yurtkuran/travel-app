import { AdminShellPage } from "@/components/ui/admin-shell-page";

export default function AdminProposalsPage() {
  return (
    <AdminShellPage
      description="Review proposed edits to published places without changing canonical content before approval."
      emptyDescription="Field-level change proposals will appear here for comparison."
      emptyTitle="No changes waiting"
      eyebrow="Moderation"
      title="Change proposals"
    />
  );
}
