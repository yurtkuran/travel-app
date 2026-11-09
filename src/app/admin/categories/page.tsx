import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdminSession } from "@/features/auth/server/session";
import {
  listActiveRatingDimensions,
  listCategories,
  type CategoryListItem,
} from "@/features/taxonomy/server/taxonomy";

import { CategoryForm } from "./category-form";

function queryValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function AdminCategoriesPage({
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
  const [result, dimensions] = await Promise.all([
    listCategories(session.actor, {
      page: queryValue(parameters.page) ?? "1",
      pageSize: 20,
      q,
      sort: sort as "name" | "name_desc" | "recent",
    }),
    listActiveRatingDimensions(session.actor),
  ]);

  return (
    <>
      <PageHeading
        description="Manage public classifications and choose which optional rating dimensions each category supports. Historical ratings remain intact if capabilities change later."
        eyebrow="Taxonomy"
        title="Manage categories"
      />
      <CategoryForm dimensions={dimensions} />
      <section
        aria-labelledby="category-list-title"
        className="management-list"
      >
        <div className="management-list__heading">
          <div>
            <p className="eyebrow">Public classification</p>
            <h2 id="category-list-title">Categories</h2>
          </div>
          <form className="list-toolbar">
            <div className="form-field">
              <label htmlFor="category-search">Search categories</label>
              <input
                defaultValue={q}
                id="category-search"
                name="q"
                type="search"
              />
            </div>
            <div className="form-field">
              <label htmlFor="category-sort">Sort</label>
              <select defaultValue={sort} id="category-sort" name="sort">
                <option value="name">Display order</option>
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
            <DataTable<CategoryListItem>
              caption="Configured categories"
              columns={[
                {
                  header: "Category",
                  key: "category",
                  render: (category) => (
                    <div className="table-primary-cell">
                      <strong>{category.name}</strong>
                      <span>{category.description ?? category.slug}</span>
                    </div>
                  ),
                },
                {
                  header: "Rating dimensions",
                  key: "dimensions",
                  render: (category) =>
                    category.ratingDimensions.length
                      ? category.ratingDimensions.join(", ")
                      : "Overall only",
                },
                {
                  align: "end",
                  header: "Order",
                  key: "order",
                  render: (category) => category.displayOrder,
                },
                {
                  align: "end",
                  header: "Status",
                  key: "status",
                  render: (category) => (
                    <StatusBadge
                      tone={category.isActive ? "positive" : "neutral"}
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </StatusBadge>
                  ),
                },
              ]}
              getRowKey={(category) => category.id}
              rows={result.items}
            />
            <Pagination
              page={result.page}
              pageSize={result.pageSize}
              pathname="/admin/categories"
              query={{ q: q || undefined, sort }}
              total={result.total}
            />
          </>
        ) : (
          <EmptyState
            description="No categories match the current search. Clear the search to return to the configured taxonomy."
            eyebrow="No search results"
            title="No matching categories"
          />
        )}
      </section>
    </>
  );
}
