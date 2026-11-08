import { ShellPage } from "@/components/ui/shell-page";

export default function PlaceVisitsPage() {
  return (
    <ShellPage
      description="Record and manage private visit snapshots for this place without changing its public review aggregate."
      emptyDescription="The visit form will include a date, overall rating, enabled dimensions, and optional private notes."
      emptyTitle="No visits to this place"
      eyebrow="Private visit history"
      title="Your visits"
    />
  );
}
