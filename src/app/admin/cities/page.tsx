import { AdminShellPage } from "@/components/ui/admin-shell-page";

export default function AdminCitiesPage() {
  return (
    <AdminShellPage
      description="Create, edit, activate, and deactivate the cities used to organize public places."
      emptyDescription="Add the first city before creating or publishing a place."
      emptyTitle="No cities configured"
      eyebrow="Taxonomy"
      title="Manage cities"
    />
  );
}
