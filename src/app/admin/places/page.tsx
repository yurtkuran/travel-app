import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdminSession } from "@/features/auth/server/session";
import {
  listManagedPlaces,
  type ManagedPlace,
} from "@/features/places/server/management";

function queryValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function AdminPlacesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
    sort?: string | string[];
    status?: string | string[];
  }>;
}) {
  const session = await requireAdminSession();
  const query = await searchParams;
  const q = queryValue(query.q) ?? "";
  const sort = queryValue(query.sort) ?? "recent";
  const status = queryValue(query.status) ?? "all";
  const result = await listManagedPlaces(session.actor, {
    page: queryValue(query.page) ?? "1",
    pageSize: 20,
    q,
    sort: sort as "name" | "name_desc" | "recent",
    status: status as "all" | "published" | "unpublished",
  });
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
        <div className="form-field">
          <label htmlFor="place-search">Search places</label>
          <input defaultValue={q} id="place-search" name="q" type="search" />
        </div>
        <div className="form-field">
          <label htmlFor="place-status">Status</label>
          <select defaultValue={status} id="place-status" name="status">
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="place-sort">Sort</label>
          <select defaultValue={sort} id="place-sort" name="sort">
            <option value="recent">Recently updated</option>
            <option value="name">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
          </select>
        </div>
        <button className="button-secondary" type="submit">
          Apply
        </button>
      </form>
      {result.items.length ? (
        <>
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
            rows={result.items}
          />
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            pathname="/admin/places"
            query={{ q: q || undefined, sort, status }}
            total={result.total}
          />
        </>
      ) : (
        <EmptyState
          description={
            q || status !== "all"
              ? "No canonical places match the current search and status filters."
              : "Create the first canonical place directly or approve one from the submission queue."
          }
          eyebrow={q || status !== "all" ? "No search results" : undefined}
          title={
            q || status !== "all"
              ? "No matching places"
              : "No places in the repository"
          }
        />
      )}
    </>
  );
}
