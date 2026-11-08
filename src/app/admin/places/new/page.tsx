import { AdminShellPage } from "@/components/ui/admin-shell-page";

export default function NewAdminPlacePage() {
  return (
    <AdminShellPage
      description="Create a canonical place directly with its public details, taxonomy, links, attribution, and publication state."
      emptyDescription="The standalone place editor will share fields and validation with the approved desktop side sheet."
      emptyTitle="Place editor ready"
      eyebrow="Repository entry"
      title="Add a place"
    />
  );
}
