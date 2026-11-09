import { notFound } from "next/navigation";

import { PageHeading } from "@/components/ui/page-heading";
import {
  PublicPlaceBrowser,
  type PublicBrowseSearchParams,
} from "@/features/places/public-place-browser";
import { getPublicCity } from "@/features/places/server/browse";

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ citySlug: string }>;
  searchParams: Promise<PublicBrowseSearchParams>;
}) {
  const { citySlug } = await params;
  const city = await getPublicCity(citySlug);
  if (!city) notFound();

  return (
    <div className="page-container shell-content">
      <PageHeading
        description={`Explore published places in ${city.name}. Public ratings include visible reviews only; personal visits remain private.`}
        eyebrow={city.subtitle ?? "City archive"}
        title={city.name}
      />
      <PublicPlaceBrowser
        fixedCity={city.slug}
        pathname={`/cities/${city.slug}`}
        searchParams={await searchParams}
      />
    </div>
  );
}
