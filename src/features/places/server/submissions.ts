import "server-only";

import { isIP } from "node:net";

import type postgres from "postgres";
import { z } from "zod";

import { getSqlClient } from "@/db/client";
import {
  requireCapability,
  requireOwnership,
  type Actor,
} from "@/features/auth/permissions";

type Transaction = postgres.TransactionSql<Record<string, never>>;

export const recommendationSourceTypes = [
  "friend",
  "instagram",
  "publication",
  "website",
  "guidebook",
  "other",
] as const;

const compactText = (value: string) => value.trim().replace(/\s+/g, " ");
const optionalText = (maximum: number, label: string, compact = true) =>
  z
    .string()
    .transform((value) => (compact ? compactText(value) : value.trim()))
    .pipe(
      z
        .string()
        .max(maximum, `${label} must be ${maximum} characters or fewer`),
    )
    .transform((value) => value || undefined)
    .optional()
    .default("");

const optionalUuid = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || z.uuid().safeParse(value).success, {
      message: `Select a valid ${label}`,
    })
    .transform((value) => value || undefined)
    .optional()
    .default("");

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second !== undefined && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first === 0
  );
}

export function isSafePublicHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !url.hostname
    ) {
      return false;
    }
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    if (hostname === "localhost" || hostname.endsWith(".local")) return false;
    const ipVersion = isIP(hostname);
    if (ipVersion === 4) return !isPrivateIpv4(hostname);
    if (ipVersion === 6) {
      const normalized = hostname.toLowerCase();
      return !(
        normalized === "::" ||
        normalized === "::1" ||
        normalized.startsWith("fc") ||
        normalized.startsWith("fd") ||
        normalized.startsWith("fe8") ||
        normalized.startsWith("fe9") ||
        normalized.startsWith("fea") ||
        normalized.startsWith("feb")
      );
    }
    return true;
  } catch {
    return false;
  }
}

const optionalHttpsUrl = z
  .string()
  .trim()
  .max(2048, "Source URL must be 2,048 characters or fewer")
  .refine(
    (value) => value === "" || isSafePublicHttpsUrl(value),
    "Enter a public HTTPS URL without embedded credentials",
  )
  .transform((value) => value || undefined)
  .optional()
  .default("");

export const placeDraftSchema = z.object({
  addressLine2: optionalText(120, "Address line 2"),
  categoryId: optionalUuid("category"),
  cityId: optionalUuid("city"),
  description: optionalText(5000, "Description", false),
  name: optionalText(160, "Place name"),
  phone: optionalText(50, "Phone number"),
  postalCode: optionalText(32, "Postal code"),
  recommendedOn: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "Recommendation date must be a valid date",
    )
    .transform((value) => value || undefined)
    .optional()
    .default(""),
  shortSummary: optionalText(500, "Short summary", false),
  sourceName: optionalText(160, "Source name"),
  sourceType: z
    .union([z.enum(recommendationSourceTypes), z.literal("")])
    .optional()
    .default("")
    .transform((value) => value || undefined),
  sourceUrl: optionalHttpsUrl,
  streetAddress: optionalText(200, "Street address"),
  submissionNotes: optionalText(5000, "Submission notes", false),
  typeLabel: optionalText(120, "Type or cuisine"),
});

export type PlaceDraftInput = z.input<typeof placeDraftSchema>;
export type SubmissionIntent = "draft" | "submit";

export class PlaceSubmissionError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "PlaceSubmissionError";
    this.field = field;
  }
}

async function assertAvailableTaxonomy(
  transaction: Transaction,
  input: { categoryId?: string; cityId?: string },
) {
  if (input.cityId) {
    const [city] = await transaction<{ available: boolean }[]>`
      select exists(
        select 1 from cities where id = ${input.cityId} and is_active
      ) as available
    `;
    if (!city?.available) {
      throw new PlaceSubmissionError(
        "Select an active city from the list",
        "cityId",
      );
    }
  }

  if (input.categoryId) {
    const [category] = await transaction<{ available: boolean }[]>`
      select exists(
        select 1 from categories where id = ${input.categoryId} and is_active
      ) as available
    `;
    if (!category?.available) {
      throw new PlaceSubmissionError(
        "Select an active category from the list",
        "categoryId",
      );
    }
  }
}

function assertReadyToSubmit(input: z.output<typeof placeDraftSchema>) {
  if (!input.name) {
    throw new PlaceSubmissionError(
      "A place name is required before submission",
      "name",
    );
  }
  if (!input.cityId) {
    throw new PlaceSubmissionError(
      "A city is required before submission",
      "cityId",
    );
  }
  if (!input.categoryId) {
    throw new PlaceSubmissionError(
      "A category is required before submission",
      "categoryId",
    );
  }
}

export async function createPlaceDraft(
  actor: Actor,
  rawInput: PlaceDraftInput,
  intent: SubmissionIntent,
) {
  requireCapability(actor, "submissions.createOwn");
  const input = placeDraftSchema.parse(rawInput);
  if (intent === "submit") assertReadyToSubmit(input);
  const status = intent === "submit" ? "pending_review" : "draft";
  const sql = getSqlClient();

  return sql.begin(async (transaction) => {
    await assertAvailableTaxonomy(transaction, input);
    const [place] = await transaction<{ id: string }[]>`
      insert into places (
        name,
        city_id,
        category_id,
        short_summary,
        description,
        type_label,
        street_address,
        address_line_2,
        postal_code,
        phone,
        status,
        submitted_by_user_id,
        created_by_user_id,
        updated_by_user_id,
        submitted_at
      ) values (
        ${input.name || null},
        ${input.cityId || null},
        ${input.categoryId || null},
        ${input.shortSummary || null},
        ${input.description || null},
        ${input.typeLabel || null},
        ${input.streetAddress || null},
        ${input.addressLine2 || null},
        ${input.postalCode || null},
        ${input.phone || null},
        ${status},
        ${actor.id},
        ${actor.id},
        ${actor.id},
        ${intent === "submit" ? new Date().toISOString() : null}
      )
      returning id
    `;
    if (!place) throw new Error("Place creation did not return a record");

    await transaction`
      insert into place_submission_provenance (
        place_id,
        submitter_user_id,
        source_type,
        source_name,
        source_url,
        recommended_on,
        submission_notes
      ) values (
        ${place.id},
        ${actor.id},
        ${input.sourceType || null},
        ${input.sourceName || null},
        ${input.sourceUrl || null},
        ${input.recommendedOn || null},
        ${input.submissionNotes || null}
      )
    `;

    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
      values (
        'user',
        ${actor.id},
        ${intent === "submit" ? "place.submitted" : "place.draft_created"},
        'place',
        ${place.id}
      )
    `;
    return { id: place.id, status };
  });
}

export async function updatePlaceDraft(
  actor: Actor,
  placeId: string,
  rawInput: PlaceDraftInput,
  intent: SubmissionIntent,
) {
  requireCapability(actor, "submissions.manageOwn");
  const input = placeDraftSchema.parse(rawInput);
  if (intent === "submit") assertReadyToSubmit(input);
  const status = intent === "submit" ? "pending_review" : "draft";
  const sql = getSqlClient();

  return sql.begin(async (transaction) => {
    const [draft] = await transaction<
      { status: string; submittedByUserId: string | null }[]
    >`
      select status, submitted_by_user_id as "submittedByUserId"
        from places
       where id = ${placeId}
       for update
    `;
    if (!draft) throw new PlaceSubmissionError("Draft not found");
    requireOwnership(actor, draft.submittedByUserId ?? "");
    if (draft.status !== "draft") {
      throw new PlaceSubmissionError("Only private drafts can be edited");
    }

    await assertAvailableTaxonomy(transaction, input);
    await transaction`
      update places
         set name = ${input.name || null},
             city_id = ${input.cityId || null},
             category_id = ${input.categoryId || null},
             short_summary = ${input.shortSummary || null},
             description = ${input.description || null},
             type_label = ${input.typeLabel || null},
             street_address = ${input.streetAddress || null},
             address_line_2 = ${input.addressLine2 || null},
             postal_code = ${input.postalCode || null},
             phone = ${input.phone || null},
             status = ${status},
             submitted_at = ${intent === "submit" ? new Date().toISOString() : null},
             updated_by_user_id = ${actor.id},
             updated_at = now()
       where id = ${placeId}
    `;
    await transaction`
      update place_submission_provenance
         set source_type = ${input.sourceType || null},
             source_name = ${input.sourceName || null},
             source_url = ${input.sourceUrl || null},
             recommended_on = ${input.recommendedOn || null},
             submission_notes = ${input.submissionNotes || null},
             updated_at = now()
       where place_id = ${placeId}
    `;
    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
      values (
        'user',
        ${actor.id},
        ${intent === "submit" ? "place.submitted" : "place.draft_updated"},
        'place',
        ${placeId}
      )
    `;
    return { id: placeId, status };
  });
}

export interface SubmissionListItem {
  categoryName: string | null;
  cityName: string | null;
  id: string;
  name: string | null;
  status: string;
  updatedAt: string;
}

export async function listOwnSubmissions(actor: Actor) {
  requireCapability(actor, "submissions.manageOwn");
  return getSqlClient()<SubmissionListItem[]>`
    select p.id,
           p.name,
           p.status,
           p.updated_at::text as "updatedAt",
           c.name as "cityName",
           cat.name as "categoryName"
      from places p
      left join cities c on c.id = p.city_id
      left join categories cat on cat.id = p.category_id
     where p.submitted_by_user_id = ${actor.id}
     order by p.updated_at desc, p.id desc
  `;
}

export interface OwnedSubmissionDetail extends SubmissionListItem {
  addressLine2: string | null;
  categoryId: string | null;
  cityId: string | null;
  description: string | null;
  phone: string | null;
  postalCode: string | null;
  moderationReason: string | null;
  recommendedOn: string | null;
  shortSummary: string | null;
  sourceName: string | null;
  sourceType: string | null;
  sourceUrl: string | null;
  streetAddress: string | null;
  submissionNotes: string | null;
  submittedByUserId: string | null;
  typeLabel: string | null;
}

export async function getOwnSubmission(actor: Actor, placeId: string) {
  requireCapability(actor, "submissions.manageOwn");
  const [submission] = await getSqlClient()<OwnedSubmissionDetail[]>`
    select p.id,
           p.name,
           p.status,
           p.updated_at::text as "updatedAt",
           p.short_summary as "shortSummary",
           p.description,
           p.type_label as "typeLabel",
           p.street_address as "streetAddress",
           p.address_line_2 as "addressLine2",
           p.postal_code as "postalCode",
           p.phone,
           p.city_id as "cityId",
           p.category_id as "categoryId",
           p.moderation_reason as "moderationReason",
           p.submitted_by_user_id as "submittedByUserId",
           c.name as "cityName",
           cat.name as "categoryName",
           provenance.source_type as "sourceType",
           provenance.source_name as "sourceName",
           provenance.source_url as "sourceUrl",
           provenance.recommended_on::text as "recommendedOn",
           provenance.submission_notes as "submissionNotes"
      from places p
      left join cities c on c.id = p.city_id
      left join categories cat on cat.id = p.category_id
      left join place_submission_provenance provenance on provenance.place_id = p.id
     where p.id = ${placeId}
       and p.submitted_by_user_id = ${actor.id}
  `;
  if (!submission) return null;
  requireOwnership(actor, submission.submittedByUserId ?? "");
  return submission;
}

export async function listSubmissionTaxonomy(actor: Actor) {
  requireCapability(actor, "submissions.createOwn");
  const sql = getSqlClient();
  const [cities, categories] = await Promise.all([
    sql<{ id: string; label: string }[]>`
      select id, concat_ws(', ', name, region, country) as label
        from cities
       where is_active
       order by name, region, country
    `,
    sql<{ id: string; label: string }[]>`
      select id, name as label
        from categories
       where is_active
       order by display_order, name
    `,
  ]);
  return { categories, cities };
}
