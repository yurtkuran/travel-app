import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { requireCurrentSession } from "@/features/auth/server/session";
import {
  listOwnVisits,
  type VisitListItem,
} from "@/features/visits/server/visits";

export default async function VisitsPage() {
  const session = await requireCurrentSession("/my/visits");
  const visits = await listOwnVisits(session.actor);
  return (
    <>
      <PageHeading
        description="A private chronology of your visits and rating snapshots. Administrators cannot browse another person's history."
        eyebrow="Private activity"
        title="Your visits"
      />
      {visits.length ? (
        <DataTable<VisitListItem>
          caption="Your private visit history"
          columns={[
            {
              header: "Place",
              key: "place",
              render: (visit) => <strong>{visit.placeName}</strong>,
            },
            {
              header: "Visited",
              key: "date",
              render: (visit) => visit.visitedOn,
            },
            {
              header: "Rating",
              key: "rating",
              render: (visit) => `${visit.overallRating} / 5`,
            },
            {
              align: "end",
              header: "Action",
              key: "action",
              render: (visit) => (
                <Link
                  className="button-secondary"
                  href={`/places/${visit.placeId}/${visit.placeSlug}/visits`}
                >
                  View history
                </Link>
              ),
            },
          ]}
          getRowKey={(visit) => visit.id}
          rows={visits}
        />
      ) : (
        <EmptyState
          description="Record a visit from any published place to begin your private history."
          title="No visits recorded"
        />
      )}
    </>
  );
}
