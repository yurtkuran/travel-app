import { ShellPage } from "@/components/ui/shell-page";

export default function NewSubmissionPage() {
  return (
    <ShellPage
      description="Create a private draft, preserve recommendation provenance, and submit the place when it is ready for administrative review."
      emptyDescription="The place draft editor will be connected during the core vertical slice."
      emptyTitle="Draft editor ready for fields"
      eyebrow="New contribution"
      title="Add a place"
    />
  );
}
