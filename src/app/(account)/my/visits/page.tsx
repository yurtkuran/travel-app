import { ShellPage } from "@/components/ui/shell-page";

export default function VisitsPage() {
  return (
    <ShellPage
      description="A private chronology of your visits and personal rating snapshots. No administrator can browse this history."
      emptyDescription="Your first recorded visit will begin a private place history and personal rating trend."
      emptyTitle="No visits recorded"
      eyebrow="Private activity"
      title="Your visits"
    />
  );
}
