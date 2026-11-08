import { AdminShellPage } from "@/components/ui/admin-shell-page";

export default function AdminAuditPage() {
  return (
    <AdminShellPage
      description="Review redacted, security-relevant administrative events in a read-only record."
      emptyDescription="Provisioning, recovery, suspension, and moderation events will appear here."
      emptyTitle="No audit events"
      eyebrow="Security record"
      title="Audit log"
    />
  );
}
