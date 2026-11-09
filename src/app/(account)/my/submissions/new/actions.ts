"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireCurrentSession } from "@/features/auth/server/session";
import type { SubmissionActionState } from "@/features/places/submission-action-state";
import {
  createPlaceDraft,
  placeDraftSchema,
  PlaceSubmissionError,
  type SubmissionIntent,
} from "@/features/places/server/submissions";

function validationState(
  previous: SubmissionActionState,
  error: z.ZodError,
): SubmissionActionState {
  const flattened = z.flattenError(error);
  return {
    fieldErrors: Object.fromEntries(
      Object.entries(flattened.fieldErrors).map(([field, messages]) => [
        field,
        Array.isArray(messages) && typeof messages[0] === "string"
          ? messages[0]
          : undefined,
      ]),
    ),
    message: "Review the highlighted fields and try again.",
    revision: previous.revision + 1,
    status: "error",
  };
}

export async function createSubmissionAction(
  previous: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  const session = await requireCurrentSession("/my/submissions/new");
  const intent: SubmissionIntent =
    formData.get("intent") === "submit" ? "submit" : "draft";
  const parsed = placeDraftSchema.safeParse({
    addressLine2: String(formData.get("addressLine2") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    cityId: String(formData.get("cityId") ?? ""),
    description: String(formData.get("description") ?? ""),
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    recommendedOn: String(formData.get("recommendedOn") ?? ""),
    shortSummary: String(formData.get("shortSummary") ?? ""),
    sourceName: String(formData.get("sourceName") ?? ""),
    sourceType: String(formData.get("sourceType") ?? ""),
    sourceUrl: String(formData.get("sourceUrl") ?? ""),
    streetAddress: String(formData.get("streetAddress") ?? ""),
    submissionNotes: String(formData.get("submissionNotes") ?? ""),
    typeLabel: String(formData.get("typeLabel") ?? ""),
  });
  if (!parsed.success) return validationState(previous, parsed.error);

  let result: Awaited<ReturnType<typeof createPlaceDraft>>;
  try {
    result = await createPlaceDraft(session.actor, parsed.data, intent);
  } catch (error) {
    return {
      fieldErrors:
        error instanceof PlaceSubmissionError && error.field
          ? { [error.field]: error.message }
          : {},
      message:
        error instanceof PlaceSubmissionError
          ? error.message
          : "The place could not be saved. Please try again.",
      revision: previous.revision + 1,
      status: "error",
    };
  }

  redirect(
    `/my/submissions/${result.id}?created=${result.status === "draft" ? "draft" : "submitted"}`,
  );
}
