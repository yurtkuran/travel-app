"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { requireCurrentSession } from "@/features/auth/server/session";
import {
  createChangeProposal,
  ProposalError,
} from "@/features/places/server/proposals";

export async function createProposalAction(formData: FormData) {
  const placeId = String(formData.get("placeId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const returnTo = `/places/${placeId}/${slug}/suggest-edit`;
  const session = await requireCurrentSession(returnTo);
  let proposal: { id: string };
  try {
    proposal = await createChangeProposal(
      session.actor,
      placeId,
      {
        addressLine2: String(formData.get("addressLine2") ?? ""),
        categoryId: String(formData.get("categoryId") ?? ""),
        cityId: String(formData.get("cityId") ?? ""),
        description: String(formData.get("description") ?? ""),
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        postalCode: String(formData.get("postalCode") ?? ""),
        shortSummary: String(formData.get("shortSummary") ?? ""),
        streetAddress: String(formData.get("streetAddress") ?? ""),
        typeLabel: String(formData.get("typeLabel") ?? ""),
      },
      String(formData.get("submitterNotes") ?? ""),
    );
  } catch (error) {
    if (error instanceof ProposalError || error instanceof ZodError) {
      redirect(`${returnTo}?error=validation`);
    }
    throw error;
  }
  redirect(`/my/proposals/${proposal.id}?created=true`);
}
