"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { requireAdminSession } from "@/features/auth/server/session";
import {
  approveProposal,
  ProposalError,
  rejectProposal,
} from "@/features/places/server/proposals";

function proposalId(formData: FormData) {
  const id = String(formData.get("proposalId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) redirect("/admin/proposals");
  return id;
}

export async function approveProposalAction(formData: FormData) {
  const session = await requireAdminSession();
  const id = proposalId(formData);
  let result: Awaited<ReturnType<typeof approveProposal>>;
  try {
    result = await approveProposal(session.actor, id);
  } catch (error) {
    if (error instanceof ProposalError) {
      const reason = error.message.includes("changed") ? "stale" : "state";
      redirect(`/admin/proposals/${id}?error=${reason}`);
    }
    throw error;
  }
  redirect(`/places/${result.placeId}/${result.slug}?proposal=approved`);
}

export async function rejectProposalAction(formData: FormData) {
  const session = await requireAdminSession();
  const id = proposalId(formData);
  try {
    await rejectProposal(
      session.actor,
      id,
      String(formData.get("reason") ?? ""),
    );
  } catch (error) {
    if (error instanceof ProposalError) {
      redirect(`/admin/proposals/${id}?error=state`);
    }
    if (error instanceof ZodError) {
      redirect(`/admin/proposals/${id}?error=reason`);
    }
    throw error;
  }
  redirect("/admin/proposals?rejected=true");
}
