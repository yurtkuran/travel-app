import { PublicPlaceFilters } from "@/features/places/public-place-filters";
import { PublicPlaceResults } from "@/features/places/public-place-results";
import {
  browsePublishedPlaces,
  listPublicCategories,
  listPublicCities,
} from "@/features/places/server/browse";
import { getCurrentSession } from "@/features/auth/server/session";

export type PublicBrowseSearchParams = Record<
  string,
  string | string[] | undefined
>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function PublicPlaceBrowser({
  fixedCategory,
  fixedCity,
  pathname,
  searchParams,
}: {
  fixedCategory?: string;
  fixedCity?: string;
  pathname: string;
  searchParams: PublicBrowseSearchParams;
}) {
  const session = await getCurrentSession();
  const raw = {
    category: fixedCategory ?? firstValue(searchParams.category),
    city: fixedCity ?? firstValue(searchParams.city),
    page: firstValue(searchParams.page),
    q: firstValue(searchParams.q),
    rating: firstValue(searchParams.rating),
    sort: firstValue(searchParams.sort),
    type: firstValue(searchParams.type),
  };
  const [result, cities, categories] = await Promise.all([
    browsePublishedPlaces(raw, session?.actor.id),
    listPublicCities(),
    listPublicCategories(),
  ]);
  const query = {
    category: fixedCategory ? undefined : result.input.category,
    city: fixedCity ? undefined : result.input.city,
    q: result.input.q,
    rating: result.input.rating ? String(result.input.rating) : undefined,
    sort: result.input.sort === "recent" ? undefined : result.input.sort,
    type: result.input.type,
  };

  return (
    <>
      <PublicPlaceFilters
        categories={categories}
        cities={cities}
        fixedCategory={fixedCategory}
        fixedCity={fixedCity}
        input={result.input}
        pathname={pathname}
      />
      <PublicPlaceResults
        items={result.items}
        page={result.page}
        pageSize={result.pageSize}
        pathname={pathname}
        query={query}
        total={result.total}
      />
    </>
  );
}
