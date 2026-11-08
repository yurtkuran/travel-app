import Link from "next/link";

import { AdminShellPage } from "@/components/ui/admin-shell-page";

export default function AdminPlacesPage() {
  return (
    <AdminShellPage
      action={
        <Link className="button-primary" href="/admin/places/new">
          Add place
        </Link>
      }
      description="Search, filter, edit, publish, and archive canonical place records while preserving private provenance."
      emptyDescription="Create the first canonical place directly or approve one from the submission queue."
      emptyTitle="No places in the repository"
      eyebrow="Repository"
      title="Manage places"
    />
  );
}
