import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdminSession } from "@/features/auth/server/session";
import {
  listCities,
  type CityListItem,
} from "@/features/taxonomy/server/taxonomy";

import { CityForm } from "./city-form";

function queryValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function AdminCitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
    sort?: string | string[];
  }>;
}) {
  const session = await requireAdminSession();
  const parameters = await searchParams;
  const q = queryValue(parameters.q) ?? "";
  const sort = queryValue(parameters.sort) ?? "name";
  const result = await listCities(session.actor, {
    page: queryValue(parameters.page) ?? "1",
    pageSize: 20,
    q,
    sort: sort as "name" | "name_desc" | "recent",
  });

  return (
    <>
      <PageHeading
        description="Create, find, and review the cities used to organize published places. Existing place history remains intact when a city is later deactivated."
        eyebrow="Taxonomy"
        title="Manage cities"
      />
      <CityForm />
      <section aria-labelledby="city-list-title" className="management-list">
        <div className="management-list__heading">
          <div>
            <p className="eyebrow">Configured geography</p>
            <h2 id="city-list-title">Cities</h2>
          </div>
          <form className="list-toolbar">
            <div className="form-field">
              <label htmlFor="city-search">Search cities</label>
              <input defaultValue={q} id="city-search" name="q" type="search" />
            </div>
            <div className="form-field">
              <label htmlFor="city-sort">Sort</label>
              <select defaultValue={sort} id="city-sort" name="sort">
                <option value="name">Name A–Z</option>
                <option value="name_desc">Name Z–A</option>
                <option value="recent">Recently added</option>
              </select>
            </div>
            <button className="button-secondary" type="submit">
              Apply
            </button>
          </form>
        </div>
        {result.items.length ? (
          <>
            <DataTable<CityListItem>
              caption="Configured cities"
              columns={[
                {
                  header: "City",
                  key: "city",
                  render: (city) => (
                    <div className="table-primary-cell">
                      <strong>{city.name}</strong>
                      <span>{city.slug}</span>
                    </div>
                  ),
                },
                {
                  header: "Region",
                  key: "region",
                  render: (city) => city.region ?? "—",
                },
                {
                  header: "Country",
                  key: "country",
                  render: (city) =>
                    city.countryCode
                      ? `${city.country} · ${city.countryCode}`
                      : city.country,
                },
                {
                  align: "end",
                  header: "Status",
                  key: "status",
                  render: (city) => (
                    <StatusBadge tone={city.isActive ? "positive" : "neutral"}>
                      {city.isActive ? "Active" : "Inactive"}
                    </StatusBadge>
                  ),
                },
              ]}
              getRowKey={(city) => city.id}
              rows={result.items}
            />
            <Pagination
              page={result.page}
              pageSize={result.pageSize}
              pathname="/admin/cities"
              query={{ q: q || undefined, sort }}
              total={result.total}
            />
          </>
        ) : (
          <EmptyState
            description={
              q
                ? "No cities match the current search. Clear the search or add a new city."
                : "Add the first city before creating or publishing a place."
            }
            eyebrow={q ? "No search results" : "Ready for the first entry"}
            title={q ? "No matching cities" : "No cities configured"}
          />
        )}
      </section>
    </>
  );
}
