import { AdminShellPage } from "@/components/ui/admin-shell-page";

export default function AdminReviewsPage() {
  return (
    <AdminShellPage
      description="Find, hide, restore, or remove public reviews while keeping private visit ratings out of moderation."
      emptyDescription="Public reviews will appear here as soon as users share them."
      emptyTitle="No reviews to moderate"
      eyebrow="Community moderation"
      title="Manage reviews"
    />
  );
}
