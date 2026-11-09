import { PageHeading } from "@/components/ui/page-heading";
import { requireAdminSession } from "@/features/auth/server/session";
import {
  listCategories,
  listCities,
} from "@/features/taxonomy/server/taxonomy";
import { createPlaceAction } from "../actions";
import { PlaceForm } from "../place-form";

export default async function NewAdminPlacePage() {
  const session = await requireAdminSession();
  const [cities, categories] = await Promise.all([
    listCities(session.actor, { pageSize: 100 }),
    listCategories(session.actor, { pageSize: 100 }),
  ]);
  return (
    <>
      <PageHeading
        description="Create a canonical place directly with its public details, taxonomy, links, attribution, and publication state."
        eyebrow="Repository entry"
        title="Add a place"
      />
      <PlaceForm
        action={createPlaceAction}
        categories={categories.items}
        cities={cities.items}
        submitLabel="Create and publish"
      />
    </>
  );
}
