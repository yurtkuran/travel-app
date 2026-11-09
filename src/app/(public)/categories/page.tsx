import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { listPublicCategories } from "@/features/places/server/browse";

export default async function CategoriesPage() {
  const categories = await listPublicCategories();
  return (
    <div className="page-container shell-content">
      <PageHeading
        description="Browse restaurants, bars, hotels, shops, arts and culture, and attractions across every published city."
        eyebrow="Browse by category"
        title="Find a kind of place"
      />
      {categories.length ? (
        <div className="taxonomy-card-grid">
          {categories.map((category) => (
            <Link
              className="taxonomy-card"
              href={`/categories/${category.slug}`}
              key={category.id}
            >
              <p className="eyebrow">Category</p>
              <h2>{category.name}</h2>
              {category.description ? <p>{category.description}</p> : null}
              <p>
                {category.placeCount} published{" "}
                {category.placeCount === 1 ? "place" : "places"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Categories will appear here after the first places are published."
          eyebrow="The archive is taking shape"
          title="No categories with published places yet"
        />
      )}
    </div>
  );
}
