"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentSession } from "@/features/auth/server/session";
import { deleteOwnReview, saveReview } from "@/features/reviews/server/reviews";

const values = (formData: FormData) =>
  Object.fromEntries(
    [...formData.entries()]
      .filter(([key, value]) => key.startsWith("rating:") && value)
      .map(([key, value]) => [key.slice(7), String(value)]),
  );

export async function saveReviewAction(formData: FormData) {
  const placeId = String(formData.get("placeId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const session = await requireCurrentSession(
    `/places/${placeId}/${slug}/review`,
  );
  await saveReview(session.actor, placeId, {
    overallRating: String(formData.get("overallRating") ?? ""),
    ratings: values(formData),
    text: String(formData.get("text") ?? ""),
  });
  revalidatePath(`/places/${placeId}/${slug}`);
  revalidatePath("/my/reviews");
  redirect(`/places/${placeId}/${slug}/review?saved=true`);
}

export async function deleteReviewAction(formData: FormData) {
  const placeId = String(formData.get("placeId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const session = await requireCurrentSession(
    `/places/${placeId}/${slug}/review`,
  );
  await deleteOwnReview(session.actor, String(formData.get("reviewId") ?? ""));
  revalidatePath(`/places/${placeId}/${slug}`);
  revalidatePath("/my/reviews");
  redirect(`/places/${placeId}/${slug}/review?deleted=true`);
}
