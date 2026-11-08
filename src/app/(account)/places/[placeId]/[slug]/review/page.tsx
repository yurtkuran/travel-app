import { ShellPage } from "@/components/ui/shell-page";

export default function ReviewPlacePage() {
  return (
    <ShellPage
      description="Create or update your single public review for this place, with a required whole-star rating."
      emptyDescription="The role-aware review form will be connected to the published place during the vertical slice."
      emptyTitle="Review form ready"
      eyebrow="Public review"
      title="Share your assessment"
    />
  );
}
