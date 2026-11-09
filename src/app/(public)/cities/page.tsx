import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { listPublicCities } from "@/features/places/server/browse";

export default async function CitiesPage() {
  const cities = await listPublicCities();
  return (
    <div className="page-container shell-content">
      <PageHeading
        description="Move through the archive one city at a time, from familiar neighborhoods to places still waiting to be explored."
        eyebrow="Browse by city"
        title="Cities in the archive"
      />
      {cities.length ? (
        <div className="taxonomy-card-grid">
          {cities.map((city) => (
            <Link
              className="taxonomy-card"
              href={`/cities/${city.slug}`}
              key={city.id}
            >
              <p className="eyebrow">{city.subtitle}</p>
              <h2>{city.name}</h2>
              <p>
                {city.placeCount} published{" "}
                {city.placeCount === 1 ? "place" : "places"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Cities will appear here after the first places are published."
          eyebrow="The archive is taking shape"
          title="No cities with published places yet"
        />
      )}
    </div>
  );
}
