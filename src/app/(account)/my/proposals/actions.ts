"use server";

import { redirect } from "next/navigation";

import { requireCurrentSession } from "@/features/auth/server/session";
import {
  ProposalError,
  withdrawOwnProposal,
} from "@/features/places/server/proposals";

export async function withdrawProposalAction(formData: FormData) {
  const id = String(formData.get("proposalId") ?? "");
  const session = await requireCurrentSession(`/my/proposals/${id}`);
  try {
    await withdrawOwnProposal(session.actor, id);
  } catch (error) {
    if (error instanceof ProposalError) {
      redirect(`/my/proposals/${id}?error=state`);
    }
    throw error;
  }
  redirect(`/my/proposals/${id}?withdrawn=true`);
}
