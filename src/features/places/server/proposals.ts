import "server-only";

import type postgres from "postgres";
import { z } from "zod";

import { getSqlClient } from "@/db/client";
import {
  requireCapability,
  requireOwnership,
  type Actor,
} from "@/features/auth/permissions";
import {
  canonicalPlaceSchema,
  type CanonicalPlaceInput,
} from "@/features/places/server/management";

type Transaction = postgres.TransactionSql<Record<string, never>>;

const rejectionSchema = z
  .string()
  .trim()
  .min(1, "A rejection reason is required")
  .max(2000, "The rejection reason must be 2,000 characters or fewer");
const notesSchema = z
  .string()
  .trim()
  .max(5000, "Notes must be 5,000 characters or fewer")
  .transform((value) => value || null);
const storedSnapshotSchema = z.object({
  _baselineUpdatedAt: z.string(),
  addressLine2: z.string().nullable(),
  categoryId: z.uuid(),
  cityId: z.uuid(),
  description: z.string().nullable(),
  name: z.string(),
  phone: z.string().nullable(),
  postalCode: z.string().nullable(),
  shortSummary: z.string().nullable(),
  streetAddress: z.string().nullable(),
  typeLabel: z.string().nullable(),
});

export type ProposalSnapshot = z.infer<typeof storedSnapshotSchema>;
export class ProposalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProposalError";
  }
}

function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 180)
      .replace(/-+$/g, "") || "place"
  );
}

async function assertTaxonomy(
  transaction: Transaction,
  cityId: string,
  categoryId: string,
) {
  const [result] = await transaction<{ valid: boolean }[]>`
    select exists(select 1 from cities where id = ${cityId} and is_active)
       and exists(select 1 from categories where id = ${categoryId} and is_active)
       as valid
  `;
  if (!result?.valid) {
    throw new ProposalError("Select an active city and category");
  }
}

interface CanonicalSnapshot {
  addressLine2: string | null;
  categoryId: string;
  categoryName: string;
  cityId: string;
  cityName: string;
  description: string | null;
  id: string;
  name: string;
  phone: string | null;
  postalCode: string | null;
  shortSummary: string | null;
  slug: string;
  streetAddress: string | null;
  typeLabel: string | null;
  updatedAt: string;
}

async function canonicalPlace(
  database: ReturnType<typeof getSqlClient> | Transaction,
  placeId: string,
  lock = false,
) {
  const query = database as Transaction;
  const rows = lock
    ? await query<CanonicalSnapshot[]>`
        select p.id, p.name, p.slug, p.city_id as "cityId", p.category_id as "categoryId",
               p.short_summary as "shortSummary", p.description, p.type_label as "typeLabel",
               p.street_address as "streetAddress", p.address_line_2 as "addressLine2",
               p.postal_code as "postalCode", p.phone, p.updated_at::text as "updatedAt",
               city.name as "cityName", category.name as "categoryName"
          from places p join cities city on city.id=p.city_id join categories category on category.id=p.category_id
         where p.id=${placeId} and p.status='published' for update of p
      `
    : await query<CanonicalSnapshot[]>`
        select p.id, p.name, p.slug, p.city_id as "cityId", p.category_id as "categoryId",
               p.short_summary as "shortSummary", p.description, p.type_label as "typeLabel",
               p.street_address as "streetAddress", p.address_line_2 as "addressLine2",
               p.postal_code as "postalCode", p.phone, p.updated_at::text as "updatedAt",
               city.name as "cityName", category.name as "categoryName"
          from places p join cities city on city.id=p.city_id join categories category on category.id=p.category_id
         where p.id=${placeId} and p.status='published'
      `;
  return rows[0] ?? null;
}

function snapshotValues(place: CanonicalSnapshot) {
  return {
    addressLine2: place.addressLine2,
    categoryId: place.categoryId,
    cityId: place.cityId,
    description: place.description,
    name: place.name,
    phone: place.phone,
    postalCode: place.postalCode,
    shortSummary: place.shortSummary,
    streetAddress: place.streetAddress,
    typeLabel: place.typeLabel,
  };
}

export async function getPlaceForProposal(actor: Actor, placeId: string) {
  requireCapability(actor, "proposals.createOwn");
  return canonicalPlace(getSqlClient(), placeId);
}

export async function createChangeProposal(
  actor: Actor,
  placeId: string,
  rawValues: CanonicalPlaceInput,
  rawNotes: string,
) {
  requireCapability(actor, "proposals.createOwn");
  const values = canonicalPlaceSchema.parse(rawValues);
  const notes = notesSchema.parse(rawNotes);
  return getSqlClient().begin(async (transaction) => {
    const current = await canonicalPlace(transaction, placeId, true);
    if (!current) throw new ProposalError("Published place not found");
    await assertTaxonomy(transaction, values.cityId, values.categoryId);
    const [pending] = await transaction<{ exists: boolean }[]>`
      select exists(
        select 1 from place_change_proposals
         where place_id=${placeId} and proposed_by_user_id=${actor.id} and status='pending_review'
      ) as exists
    `;
    if (pending?.exists) {
      throw new ProposalError(
        "You already have a pending proposal for this place",
      );
    }
    if (JSON.stringify(snapshotValues(current)) === JSON.stringify(values)) {
      throw new ProposalError(
        "Change at least one public field before submitting",
      );
    }
    const snapshot: ProposalSnapshot = {
      _baselineUpdatedAt: current.updatedAt,
      ...values,
    };
    const [proposal] = await transaction<{ id: string }[]>`
      insert into place_change_proposals (
        place_id, proposed_by_user_id, status, proposed_values, submitter_notes, submitted_at
      ) values (${placeId}, ${actor.id}, 'pending_review', ${JSON.stringify(snapshot)}::jsonb, ${notes}, now())
      returning id
    `;
    if (!proposal) throw new Error("Proposal creation did not return a record");
    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
      values ('user', ${actor.id}, 'proposal.submitted', 'proposal', ${proposal.id})
    `;
    return proposal;
  });
}

export interface ProposalListItem {
  createdAt: string;
  id: string;
  placeId: string;
  placeName: string;
  placeSlug: string;
  status: string;
  updatedAt: string;
}

export async function listOwnProposals(actor: Actor) {
  requireCapability(actor, "proposals.manageOwn");
  return getSqlClient()<ProposalListItem[]>`
    select proposal.id, proposal.place_id as "placeId", proposal.status,
           proposal.created_at::text as "createdAt", proposal.updated_at::text as "updatedAt",
           place.name as "placeName", place.slug as "placeSlug"
      from place_change_proposals proposal join places place on place.id=proposal.place_id
     where proposal.proposed_by_user_id=${actor.id}
     order by proposal.updated_at desc, proposal.id desc
  `;
}

export interface ProposalDetail extends ProposalListItem {
  current: CanonicalSnapshot;
  decidedAt: string | null;
  decisionReason: string | null;
  isStale: boolean;
  proposed: ProposalSnapshot;
  proposedCategoryName: string;
  proposedCityName: string;
  proposedByUserId: string | null;
  submitterName: string | null;
  submitterNotes: string | null;
}

async function proposalDetail(id: string) {
  const [proposal] = await getSqlClient()<
    (Omit<ProposalDetail, "current" | "isStale" | "proposed"> & {
      proposedValues: unknown;
    })[]
  >`
    select proposal.id, proposal.place_id as "placeId", proposal.status,
           proposal.proposed_by_user_id as "proposedByUserId",
           proposal.submitter_notes as "submitterNotes",
           proposal.decision_reason as "decisionReason",
           proposal.decided_at::text as "decidedAt",
           proposal.created_at::text as "createdAt", proposal.updated_at::text as "updatedAt",
           proposal.proposed_values as "proposedValues", place.name as "placeName",
           place.slug as "placeSlug", submitter.name as "submitterName"
      from place_change_proposals proposal
      join places place on place.id=proposal.place_id
      left join "user" submitter on submitter.id=proposal.proposed_by_user_id
     where proposal.id=${id}
  `;
  if (!proposal) return null;
  const proposed = storedSnapshotSchema.parse(proposal.proposedValues);
  const current = await canonicalPlace(getSqlClient(), proposal.placeId);
  if (!current) return null;
  const [taxonomy] = await getSqlClient()<
    { categoryName: string; cityName: string }[]
  >`
    select category.name as "categoryName", city.name as "cityName"
      from categories category, cities city
     where category.id=${proposed.categoryId} and city.id=${proposed.cityId}
  `;
  if (!taxonomy) return null;
  return {
    ...proposal,
    current,
    isStale: current.updatedAt !== proposed._baselineUpdatedAt,
    proposed,
    proposedCategoryName: taxonomy.categoryName,
    proposedCityName: taxonomy.cityName,
  };
}

export async function getOwnProposal(actor: Actor, id: string) {
  requireCapability(actor, "proposals.manageOwn");
  const proposal = await proposalDetail(id);
  if (!proposal) return null;
  requireOwnership(actor, proposal.proposedByUserId ?? "");
  return proposal;
}

export async function withdrawOwnProposal(actor: Actor, id: string) {
  requireCapability(actor, "proposals.manageOwn");
  await getSqlClient().begin(async (transaction) => {
    const [proposal] = await transaction<
      { proposed_by_user_id: string | null; status: string }[]
    >`
      select proposed_by_user_id, status from place_change_proposals where id=${id} for update
    `;
    if (!proposal) throw new ProposalError("Proposal not found");
    requireOwnership(actor, proposal.proposed_by_user_id ?? "");
    if (proposal.status !== "pending_review") {
      throw new ProposalError("This proposal can no longer be withdrawn");
    }
    await transaction`
      update place_change_proposals set status='withdrawn', withdrawn_at=now(), updated_at=now()
       where id=${id}
    `;
    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
      values ('user', ${actor.id}, 'proposal.withdrawn', 'proposal', ${id})
    `;
  });
}

export async function listPendingProposals(actor: Actor) {
  requireCapability(actor, "proposals.moderate");
  return getSqlClient()<
    (ProposalListItem & { submitterName: string | null })[]
  >`
    select proposal.id, proposal.place_id as "placeId", proposal.status,
           proposal.created_at::text as "createdAt", proposal.updated_at::text as "updatedAt",
           place.name as "placeName", place.slug as "placeSlug", submitter.name as "submitterName"
      from place_change_proposals proposal join places place on place.id=proposal.place_id
      left join "user" submitter on submitter.id=proposal.proposed_by_user_id
     where proposal.status='pending_review'
     order by proposal.submitted_at, proposal.id
  `;
}

export async function getProposalForModeration(actor: Actor, id: string) {
  requireCapability(actor, "proposals.moderate");
  return proposalDetail(id);
}

async function lockPendingProposal(transaction: Transaction, id: string) {
  const [proposal] = await transaction<
    { place_id: string; proposed_values: unknown; status: string }[]
  >`
    select place_id, proposed_values, status from place_change_proposals where id=${id} for update
  `;
  if (!proposal) throw new ProposalError("Proposal not found");
  if (proposal.status !== "pending_review") {
    throw new ProposalError("This proposal is no longer waiting for review");
  }
  return {
    placeId: proposal.place_id,
    proposed: storedSnapshotSchema.parse(proposal.proposed_values),
  };
}

export async function approveProposal(actor: Actor, id: string) {
  requireCapability(actor, "proposals.moderate");
  requireCapability(actor, "places.manageAny");
  return getSqlClient().begin(async (transaction) => {
    const proposal = await lockPendingProposal(transaction, id);
    const current = await canonicalPlace(transaction, proposal.placeId, true);
    if (!current) throw new ProposalError("Published place not found");
    if (current.updatedAt !== proposal.proposed._baselineUpdatedAt) {
      throw new ProposalError(
        "The canonical place changed after this proposal was submitted",
      );
    }
    await assertTaxonomy(
      transaction,
      proposal.proposed.cityId,
      proposal.proposed.categoryId,
    );
    const values = proposal.proposed;
    const slug = slugify(values.name);
    await transaction`
      update places set name=${values.name}, slug=${slug}, city_id=${values.cityId},
             category_id=${values.categoryId}, short_summary=${values.shortSummary},
             description=${values.description}, type_label=${values.typeLabel},
             street_address=${values.streetAddress}, address_line_2=${values.addressLine2},
             postal_code=${values.postalCode}, phone=${values.phone},
             updated_by_user_id=${actor.id}, updated_at=now()
       where id=${proposal.placeId} and status='published'
    `;
    await transaction`
      update place_change_proposals set status='approved', decided_by_user_id=${actor.id},
             decided_at=now(), updated_at=now() where id=${id}
    `;
    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id, metadata)
      values ('user', ${actor.id}, 'proposal.approved', 'proposal', ${id}, ${JSON.stringify(
        {
          placeId: proposal.placeId,
        },
      )}::jsonb)
    `;
    return { placeId: proposal.placeId, slug };
  });
}

export async function rejectProposal(
  actor: Actor,
  id: string,
  rawReason: string,
) {
  requireCapability(actor, "proposals.moderate");
  const reason = rejectionSchema.parse(rawReason);
  await getSqlClient().begin(async (transaction) => {
    await lockPendingProposal(transaction, id);
    await transaction`
      update place_change_proposals set status='rejected', decision_reason=${reason},
             decided_by_user_id=${actor.id}, decided_at=now(), updated_at=now()
       where id=${id}
    `;
    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
      values ('user', ${actor.id}, 'proposal.rejected', 'proposal', ${id})
    `;
  });
}
