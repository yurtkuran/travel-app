import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdminSession } from "@/features/auth/server/session";
import {
  listManagedPlaces,
  type ManagedPlace,
} from "@/features/places/server/management";

export default async function AdminPlacesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAdminSession();
  const query = await searchParams;
  const places = await listManagedPlaces(session.actor, query.q?.trim());
  return (
    <>
      <PageHeading
        action={
          <Link className="button-primary" href="/admin/places/new">
            Add place
          </Link>
        }
        description="Search, filter, edit, publish, and archive canonical place records while preserving private provenance."
        eyebrow="Repository"
        title="Manage places"
      />
      <form className="list-toolbar">
        <label>
          Search places
          <input name="q" defaultValue={query.q} />
        </label>
        <button className="button-secondary" type="submit">
          Search
        </button>
      </form>
      {places.length ? (
        <DataTable<ManagedPlace>
          caption="Canonical places"
          columns={[
            {
              header: "Place",
              key: "place",
              render: (place) => (
                <div className="table-primary-cell">
                  <strong>{place.name}</strong>
                  <span>
                    {place.cityName} · {place.categoryName}
                  </span>
                </div>
              ),
            },
            {
              header: "Status",
              key: "status",
              render: (place) => (
                <StatusBadge
                  tone={place.status === "published" ? "positive" : "warning"}
                >
                  {place.status}
                </StatusBadge>
              ),
            },
            {
              align: "end",
              header: "Action",
              key: "action",
              render: (place) => (
                <Link
                  className="button-secondary"
                  href={`/admin/places/${place.id}`}
                >
                  Edit
                </Link>
              ),
            },
          ]}
          getRowKey={(place) => place.id}
          rows={places}
        />
      ) : (
        <EmptyState
          description="Create the first canonical place directly or approve one from the submission queue."
          title="No places in the repository"
        />
      )}
    </>
  );
}
