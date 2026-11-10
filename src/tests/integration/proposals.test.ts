import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { getSqlClient } from "@/db/client";
import { AuthorizationError, type Actor } from "@/features/auth/permissions";
import {
  approveProposal,
  createChangeProposal,
  getOwnProposal,
  getPlaceForProposal,
  listPendingProposals,
  ProposalError,
  rejectProposal,
  withdrawOwnProposal,
} from "@/features/places/server/proposals";

import {
  createTestCity,
  createTestPlace,
  createTestUser,
  seededTaxonomy,
} from "../factories/database";

const sql = getSqlClient();
let admin: Actor;
let cityId: string;
let other: Actor;
let owner: Actor;
const placeIds: string[] = [];
const proposalIds: string[] = [];

async function placeValues(placeId: string, summary: string) {
  const place = await getPlaceForProposal(owner, placeId);
  if (!place) throw new Error("Test place not found");
  return {
    addressLine2: place.addressLine2 ?? "",
    categoryId: place.categoryId,
    cityId: place.cityId,
    description: place.description ?? "",
    name: place.name,
    phone: place.phone ?? "",
    postalCode: place.postalCode ?? "",
    shortSummary: summary,
    streetAddress: place.streetAddress ?? "",
    typeLabel: place.typeLabel ?? "",
  };
}

async function testPlace() {
  const place = await createTestPlace(sql, {
    categoryId: seededTaxonomy.categories.restaurant,
    cityId,
    createdByUserId: owner.id,
  });
  placeIds.push(place.id);
  return place.id;
}

describe("published place change proposals", () => {
  beforeAll(async () => {
    const [ownerUser, otherUser, adminUser] = await Promise.all([
      createTestUser(sql, "Proposal Owner"),
      createTestUser(sql, "Proposal Other"),
      createTestUser(sql, "Proposal Admin"),
    ]);
    owner = { id: ownerUser.id, role: "user" };
    other = { id: otherUser.id, role: "user" };
    admin = { id: adminUser.id, role: "admin" };
    cityId = (await createTestCity(sql)).id;
  });

  afterAll(async () => {
    if (proposalIds.length) {
      await sql`delete from audit_events where target_type='proposal' and target_id in ${sql(proposalIds)}`;
      await sql`delete from place_change_proposals where id in ${sql(proposalIds)}`;
    }
    if (placeIds.length) {
      await sql`delete from places where id in ${sql(placeIds)}`;
    }
    if (cityId) await sql`delete from cities where id=${cityId}`;
    if (owner?.id && other?.id && admin?.id) {
      await sql`delete from "user" where id in ${sql([owner.id, other.id, admin.id])}`;
    }
    await sql.end();
  });

  test("submits an owner-private snapshot and applies it transactionally", async () => {
    const placeId = await testPlace();
    const proposal = await createChangeProposal(
      owner,
      placeId,
      await placeValues(placeId, "An approved proposed summary."),
      "Private supporting context.",
    );
    proposalIds.push(proposal.id);
    await expect(getOwnProposal(other, proposal.id)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    expect(await getOwnProposal(owner, proposal.id)).toMatchObject({
      status: "pending_review",
      submitterNotes: "Private supporting context.",
    });
    await approveProposal(admin, proposal.id);
    const [place] = await sql<{ shortSummary: string }[]>`
      select short_summary as "shortSummary" from places where id=${placeId}
    `;
    expect(place?.shortSummary).toBe("An approved proposed summary.");
    expect(await getOwnProposal(owner, proposal.id)).toMatchObject({
      status: "approved",
    });
  });

  test("rejects a proposal with an owner-visible reason", async () => {
    const placeId = await testPlace();
    const proposal = await createChangeProposal(
      owner,
      placeId,
      await placeValues(placeId, "A rejected proposed summary."),
      "",
    );
    proposalIds.push(proposal.id);
    await rejectProposal(
      admin,
      proposal.id,
      "The source could not be verified.",
    );
    expect(await getOwnProposal(owner, proposal.id)).toMatchObject({
      decisionReason: "The source could not be verified.",
      status: "rejected",
    });
  });

  test("allows only the owner to withdraw a pending proposal", async () => {
    const placeId = await testPlace();
    const proposal = await createChangeProposal(
      owner,
      placeId,
      await placeValues(placeId, "A withdrawn proposed summary."),
      "",
    );
    proposalIds.push(proposal.id);
    await expect(
      withdrawOwnProposal(other, proposal.id),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await withdrawOwnProposal(owner, proposal.id);
    expect(await getOwnProposal(owner, proposal.id)).toMatchObject({
      status: "withdrawn",
    });
  });

  test("detects stale canonical values and blocks approval", async () => {
    const placeId = await testPlace();
    const proposal = await createChangeProposal(
      owner,
      placeId,
      await placeValues(placeId, "A stale proposed summary."),
      "",
    );
    proposalIds.push(proposal.id);
    await sql`
      update places set short_summary='A newer administrative edit.', updated_at=now() + interval '1 second'
       where id=${placeId}
    `;
    expect(await getOwnProposal(owner, proposal.id)).toMatchObject({
      isStale: true,
    });
    await expect(approveProposal(admin, proposal.id)).rejects.toBeInstanceOf(
      ProposalError,
    );
    await rejectProposal(admin, proposal.id, "Superseded by a newer edit.");
  });

  test("lists only pending proposals in the moderation queue", async () => {
    const placeId = await testPlace();
    const proposal = await createChangeProposal(
      owner,
      placeId,
      await placeValues(placeId, "A queued proposed summary."),
      "",
    );
    proposalIds.push(proposal.id);
    expect((await listPendingProposals(admin)).map(({ id }) => id)).toContain(
      proposal.id,
    );
  });
});
