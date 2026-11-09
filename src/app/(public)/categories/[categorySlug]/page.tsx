import { notFound } from "next/navigation";

import { PageHeading } from "@/components/ui/page-heading";
import {
  PublicPlaceBrowser,
  type PublicBrowseSearchParams,
} from "@/features/places/public-place-browser";
import { getPublicCategory } from "@/features/places/server/browse";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<PublicBrowseSearchParams>;
}) {
  const { categorySlug } = await params;
  const category = await getPublicCategory(categorySlug);
  if (!category) notFound();

  return (
    <div className="page-container shell-content">
      <PageHeading
        description={
          category.description ??
          `Explore published ${category.name.toLowerCase()} across the archive.`
        }
        eyebrow="Category archive"
        title={category.name}
      />
      <PublicPlaceBrowser
        fixedCategory={category.slug}
        pathname={`/categories/${category.slug}`}
        searchParams={await searchParams}
      />
    </div>
  );
}
