import "server-only";

import { getSqlClient } from "@/db/client";
import { requireCapability, type Actor } from "@/features/auth/permissions";

export interface DashboardQueueItem {
  actionLabel: string;
  actorName: string | null;
  createdAt: string;
  href: string;
  id: string;
  subject: string;
  type: "proposal" | "review" | "submission";
}

export interface DashboardActivityItem {
  action: string;
  actorName: string | null;
  actorType: "system" | "user";
  createdAt: string;
  id: string;
  targetType: string;
}

export async function getAdministrationDashboard(actor: Actor) {
  requireCapability(actor, "operations.manage");
  const sql = getSqlClient();
  const [counts, queueRows, activity] = await Promise.all([
    sql<
      {
        hiddenReviews: number;
        pendingProposals: number;
        pendingSubmissions: number;
      }[]
    >`
      select
        (select count(*)::integer from places where status='pending_review') as "pendingSubmissions",
        (select count(*)::integer from place_change_proposals where status='pending_review') as "pendingProposals",
        (select count(*)::integer from reviews where moderation_status='hidden') as "hiddenReviews"
    `,
    sql<
      {
        actorName: string | null;
        createdAt: string;
        id: string;
        subject: string;
        type: DashboardQueueItem["type"];
      }[]
    >`
      select queue.type, queue.id, queue.subject, queue."actorName",
             queue."createdAt"::text as "createdAt"
        from (
          select 'submission'::text as type, place.id::text as id,
                 coalesce(place.name, 'Untitled place')::text as subject,
                 submitter.name::text as "actorName", place.submitted_at as "createdAt"
            from places place
            left join "user" submitter on submitter.id=place.submitted_by_user_id
           where place.status='pending_review'
          union all
          select 'proposal'::text, proposal.id::text, place.name::text,
                 submitter.name::text, proposal.submitted_at
            from place_change_proposals proposal
            join places place on place.id=proposal.place_id
            left join "user" submitter on submitter.id=proposal.proposed_by_user_id
           where proposal.status='pending_review'
          union all
          select 'review'::text, review.id::text, place.name::text,
                 author.name::text, review.updated_at
            from reviews review
            join places place on place.id=review.place_id
            left join "user" author on author.id=review.user_id
           where review.moderation_status='hidden'
        ) queue
       order by queue."createdAt", queue.id
       limit 8
    `,
    sql<DashboardActivityItem[]>`
      select audit.id, audit.actor_type as "actorType",
             actor.name as "actorName", audit.action,
             audit.target_type as "targetType",
             audit.created_at::text as "createdAt"
        from audit_events audit
        left join "user" actor on actor.id=audit.actor_user_id
       order by audit.created_at desc, audit.id desc
       limit 6
    `,
  ]);

  const queue: DashboardQueueItem[] = queueRows.map((item) => ({
    ...item,
    actionLabel:
      item.type === "proposal"
        ? "Compare"
        : item.type === "submission"
          ? "Review"
          : "Moderate",
    href:
      item.type === "proposal"
        ? `/admin/proposals/${item.id}`
        : item.type === "submission"
          ? `/admin/submissions/${item.id}`
          : "/admin/reviews",
  }));

  return {
    activity,
    counts: counts[0] ?? {
      hiddenReviews: 0,
      pendingProposals: 0,
      pendingSubmissions: 0,
    },
    queue,
  };
}
