import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import type { PublicPlaceCard as Place } from "@/features/places/server/browse";

import { PublicPlaceCard } from "./public-place-card";

export function PublicPlaceResults({
  items,
  page,
  pageSize,
  pathname,
  query,
  total,
}: {
  items: Place[];
  page: number;
  pageSize: number;
  pathname: string;
  query: Record<string, string | undefined>;
  total: number;
}) {
  if (!items.length)
    return (
      <EmptyState
        description="Try clearing a filter or exploring another city or category."
        eyebrow="No matching places"
        title="Nothing matched this view"
      />
    );
  return (
    <>
      <p aria-live="polite" className="result-summary">
        {total} {total === 1 ? "place" : "places"}
      </p>
      <div className="place-card-grid">
        {items.map((place) => (
          <PublicPlaceCard key={place.id} place={place} />
        ))}
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        pathname={pathname}
        query={query}
        total={total}
      />
    </>
  );
}
