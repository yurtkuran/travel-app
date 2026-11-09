"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { requireAdminSession } from "@/features/auth/server/session";
import {
  PlaceModerationError,
  publishSubmission,
  rejectSubmission,
} from "@/features/places/server/moderation";

function submissionId(formData: FormData) {
  const value = String(formData.get("submissionId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(value)) redirect("/admin/submissions");
  return value;
}

export async function publishSubmissionAction(formData: FormData) {
  const session = await requireAdminSession();
  const id = submissionId(formData);
  let published: Awaited<ReturnType<typeof publishSubmission>>;
  try {
    published = await publishSubmission(session.actor, id);
  } catch (error) {
    if (error instanceof PlaceModerationError) {
      redirect(`/admin/submissions/${id}?error=state`);
    }
    throw error;
  }
  redirect(`/places/${published.id}/${published.slug}?published=true`);
}

export async function rejectSubmissionAction(formData: FormData) {
  const session = await requireAdminSession();
  const id = submissionId(formData);
  const reason = String(formData.get("reason") ?? "");
  try {
    await rejectSubmission(session.actor, id, reason);
  } catch (error) {
    if (error instanceof PlaceModerationError) {
      redirect(`/admin/submissions/${id}?error=state`);
    }
    if (error instanceof ZodError) {
      redirect(`/admin/submissions/${id}?error=reason`);
    }
    throw error;
  }
  redirect(`/admin/submissions?rejected=true`);
}
