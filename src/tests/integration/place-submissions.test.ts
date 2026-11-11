import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { getSqlClient } from "@/db/client";
import { AuthorizationError, type Actor } from "@/features/auth/permissions";
import {
  createPlaceDraft,
  getOwnSubmission,
  isSafePublicHttpsUrl,
  listOwnSubmissions,
  PlaceSubmissionError,
  updatePlaceDraft,
} from "@/features/places/server/submissions";

import {
  createTestCity,
  createTestUser,
  seededTaxonomy,
} from "../factories/database";

const sql = getSqlClient();
const createdPlaceIds: string[] = [];
let cityId: string;
let actor: Actor;
let otherActor: Actor;

describe("place submission lifecycle", () => {
  beforeAll(async () => {
    const user = await createTestUser(sql, "Submission Owner");
    const other = await createTestUser(sql, "Other Submission User");
    const city = await createTestCity(sql);
    actor = { id: user.id, role: "user" };
    otherActor = { id: other.id, role: "user" };
    cityId = city.id;
  });

  afterAll(async () => {
    if (createdPlaceIds.length) {
      await sql`delete from audit_events where target_type = 'place' and target_id in ${sql(createdPlaceIds)}`;
      await sql`delete from places where id in ${sql(createdPlaceIds)}`;
    }
    if (cityId) await sql`delete from cities where id = ${cityId}`;
    if (actor?.id && otherActor?.id) {
      await sql`delete from "user" where id in ${sql([actor.id, otherActor.id])}`;
    }
    await sql.end();
  });

  test("saves an incomplete private draft with separate provenance", async () => {
    const draft = await createPlaceDraft(
      actor,
      {
        name: "  A   Future Place  ",
        sourceName: "A trusted friend",
        sourceType: "friend",
        submissionNotes: "  Keep this context private.  ",
      },
      "draft",
    );
    createdPlaceIds.push(draft.id);

    const detail = await getOwnSubmission(actor, draft.id);
    expect(detail).toMatchObject({
      name: "A Future Place",
      sourceName: "A trusted friend",
      sourceType: "friend",
      status: "draft",
      submissionNotes: "Keep this context private.",
    });
    await expect(getOwnSubmission(otherActor, draft.id)).resolves.toBeNull();
  });

  test("requires identity and classification before submission", async () => {
    await expect(
      createPlaceDraft(actor, { name: "Incomplete" }, "submit"),
    ).rejects.toMatchObject<Partial<PlaceSubmissionError>>({
      field: "cityId",
      name: "PlaceSubmissionError",
    });
  });

  test("lets only the owner update and submit a private draft", async () => {
    const draft = await createPlaceDraft(
      actor,
      { name: "Draft to refine", sourceType: "friend" },
      "draft",
    );
    createdPlaceIds.push(draft.id);

    await expect(
      updatePlaceDraft(
        otherActor,
        draft.id,
        { name: "Not the owner" },
        "draft",
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);

    await updatePlaceDraft(
      actor,
      draft.id,
      {
        categoryId: seededTaxonomy.categories.restaurant,
        cityId,
        name: "Refined draft",
        sourceName: "Trusted traveler",
        sourceType: "friend",
      },
      "draft",
    );
    expect(await getOwnSubmission(actor, draft.id)).toMatchObject({
      name: "Refined draft",
      sourceName: "Trusted traveler",
      status: "draft",
    });

    await updatePlaceDraft(
      actor,
      draft.id,
      {
        categoryId: seededTaxonomy.categories.restaurant,
        cityId,
        name: "Refined draft",
        sourceName: "Trusted traveler",
        sourceType: "friend",
      },
      "submit",
    );
    expect(await getOwnSubmission(actor, draft.id)).toMatchObject({
      status: "pending_review",
    });
    await expect(
      updatePlaceDraft(actor, draft.id, { name: "Too late" }, "draft"),
    ).rejects.toBeInstanceOf(PlaceSubmissionError);
  });

  test("submits a complete place and records an audit event", async () => {
    const submitted = await createPlaceDraft(
      actor,
      {
        categoryId: seededTaxonomy.categories.restaurant,
        cityId,
        description: "A place ready for administrator review.",
        name: `Submitted Place ${randomUUID()}`,
        sourceType: "publication",
        sourceUrl: "https://example.com/travel/story",
      },
      "submit",
    );
    createdPlaceIds.push(submitted.id);

    const [stored] = await sql<
      { action: string; status: string; submitted_at: string | null }[]
    >`
      select p.status, p.submitted_at::text, ae.action
        from places p
        join audit_events ae on ae.target_id = p.id::text and ae.target_type = 'place'
       where p.id = ${submitted.id}
    `;
    expect(stored?.status).toBe("pending_review");
    expect(stored?.submitted_at).not.toBeNull();
    expect(stored?.action).toBe("place.submitted");

    const owned = await listOwnSubmissions(actor);
    expect(owned.map(({ id }) => id)).toContain(submitted.id);
    const other = await listOwnSubmissions(otherActor);
    expect(other.map(({ id }) => id)).not.toContain(submitted.id);
  });

  test("rejects inactive taxonomy selected by a manipulated client", async () => {
    await sql`update cities set is_active = false where id = ${cityId}`;
    await expect(
      createPlaceDraft(
        actor,
        {
          categoryId: seededTaxonomy.categories.restaurant,
          cityId,
          name: "Unavailable City Place",
        },
        "submit",
      ),
    ).rejects.toMatchObject<Partial<PlaceSubmissionError>>({ field: "cityId" });
    await sql`update cities set is_active = true where id = ${cityId}`;
  });

  test("accepts only public HTTPS provenance URLs", () => {
    expect(isSafePublicHttpsUrl("https://example.com/place")).toBe(true);
    expect(isSafePublicHttpsUrl("http://example.com/place")).toBe(false);
    expect(isSafePublicHttpsUrl("https://user:secret@example.com")).toBe(false);
    expect(isSafePublicHttpsUrl("https://127.0.0.1/private")).toBe(false);
    expect(isSafePublicHttpsUrl("https://192.168.1.4/private")).toBe(false);
    expect(isSafePublicHttpsUrl("https://localhost/private")).toBe(false);
  });
});
