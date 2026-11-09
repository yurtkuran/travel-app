import { StatusBadge } from "@/components/ui/status-badge";

const labels: Record<string, string> = {
  archived: "Archived",
  draft: "Draft",
  pending_review: "Pending review",
  published: "Published",
  rejected: "Rejected",
  unpublished: "Unpublished",
  withdrawn: "Withdrawn",
};

export function SubmissionStatus({ status }: { status: string }) {
  const tone =
    status === "published"
      ? "positive"
      : status === "rejected" || status === "withdrawn"
        ? "critical"
        : status === "pending_review"
          ? "warning"
          : "neutral";
  return <StatusBadge tone={tone}>{labels[status] ?? status}</StatusBadge>;
}
