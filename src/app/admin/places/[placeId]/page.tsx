import { AdminShellPage } from "@/components/ui/admin-shell-page";

export default async function EditAdminPlacePage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId } = await params;
  return (
    <AdminShellPage
      description="Edit canonical public information, manage publication state, and keep provenance separate from public attribution."
      emptyDescription={`Place ${placeId} will load here when repository operations are connected.`}
      emptyTitle="Place record unavailable"
      eyebrow="Repository entry"
      title="Edit place"
    />
  );
}
