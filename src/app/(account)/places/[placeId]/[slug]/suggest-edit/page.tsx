import { ShellPage } from "@/components/ui/shell-page";

export default function SuggestEditPage() {
  return (
    <ShellPage
      description="Suggest a change to published information while preserving the canonical place until an administrator approves it."
      emptyDescription="The proposal form will compare editable public fields with their current canonical values."
      emptyTitle="Edit proposal ready"
      eyebrow="Published place"
      title="Suggest an edit"
    />
  );
}
