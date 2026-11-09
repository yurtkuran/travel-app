"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentSession } from "@/features/auth/server/session";
import {
  createVisit,
  deleteVisit,
  updateVisit,
} from "@/features/visits/server/visits";

function ratings(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()]
      .filter(([key, value]) => key.startsWith("rating:") && value)
      .map(([key, value]) => [key.slice(7), String(value)]),
  );
}

export async function createVisitAction(formData: FormData) {
  const placeId = String(formData.get("placeId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const session = await requireCurrentSession(
    `/places/${placeId}/${slug}/visits`,
  );
  await createVisit(session.actor, placeId, {
    notes: String(formData.get("notes") ?? ""),
    overallRating: String(formData.get("overallRating") ?? ""),
    ratings: ratings(formData),
    visitedOn: String(formData.get("visitedOn") ?? ""),
  });
  revalidatePath("/my/visits");
  redirect(`/places/${placeId}/${slug}/visits?created=true`);
}

export async function deleteVisitAction(formData: FormData) {
  const placeId = String(formData.get("placeId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const session = await requireCurrentSession(
    `/places/${placeId}/${slug}/visits`,
  );
  await deleteVisit(session.actor, String(formData.get("visitId") ?? ""));
  revalidatePath("/my/visits");
  redirect(`/places/${placeId}/${slug}/visits?deleted=true`);
}

export async function updateVisitAction(formData: FormData) {
  const placeId = String(formData.get("placeId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const session = await requireCurrentSession(
    `/places/${placeId}/${slug}/visits`,
  );
  await updateVisit(session.actor, String(formData.get("visitId") ?? ""), {
    notes: String(formData.get("notes") ?? ""),
    overallRating: String(formData.get("overallRating") ?? ""),
    ratings: ratings(formData),
    visitedOn: String(formData.get("visitedOn") ?? ""),
  });
  revalidatePath("/my/visits");
  redirect(`/places/${placeId}/${slug}/visits?updated=true`);
}
