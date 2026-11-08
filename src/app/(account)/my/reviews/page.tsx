import { ShellPage } from "@/components/ui/shell-page";

export default function ReviewsPage() {
  return (
    <ShellPage
      description="Manage the public reviews you have shared, including any moderation state that applies to them."
      emptyDescription="Reviews you add from a published place will appear here."
      emptyTitle="No reviews shared"
      eyebrow="Public contributions"
      title="Your reviews"
    />
  );
}
