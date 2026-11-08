import Link from "next/link";

import { ShellPage } from "@/components/ui/shell-page";

export default function SubmissionsPage() {
  return (
    <ShellPage
      action={
        <Link className="button-primary" href="/my/submissions/new">
          Add a place
        </Link>
      }
      description="Draft new places, submit them for review, and follow each contribution through the publication workflow."
      emptyDescription="Create a draft to recommend a place for the public archive."
      emptyTitle="No place submissions"
      eyebrow="Contribution workspace"
      title="Your submissions"
    />
  );
}
