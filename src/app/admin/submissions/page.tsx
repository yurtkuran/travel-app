import { AdminShellPage } from "@/components/ui/admin-shell-page";

export default function AdminSubmissionsPage() {
  return (
    <AdminShellPage
      description="Review user-submitted places, compare private provenance, and approve or reject publication."
      emptyDescription="New user submissions will appear here without exposing them on public routes."
      emptyTitle="No submissions waiting"
      eyebrow="Moderation"
      title="Place submissions"
    />
  );
}
