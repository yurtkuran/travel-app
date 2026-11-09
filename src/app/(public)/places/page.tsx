import { PageHeading } from "@/components/ui/page-heading";
import {
  PublicPlaceBrowser,
  type PublicBrowseSearchParams,
} from "@/features/places/public-place-browser";

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<PublicBrowseSearchParams>;
}) {
  return (
    <div className="page-container shell-content">
      <PageHeading
        description="Search and filter the public archive by city, category, type, and rating. Private visits and notes never appear here."
        eyebrow="Explore"
        title="Places worth remembering"
      />
      <PublicPlaceBrowser
        pathname="/places"
        searchParams={await searchParams}
      />
    </div>
  );
}
