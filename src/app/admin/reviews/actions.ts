"use server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/features/auth/server/session";
import { moderateReview } from "@/features/reviews/server/reviews";
export async function moderateReviewAction(formData: FormData) {
  const session = await requireAdminSession();
  const status = String(formData.get("status"));
  if (status !== "visible" && status !== "hidden" && status !== "removed")
    throw new Error("Invalid moderation status");
  await moderateReview(
    session.actor,
    String(formData.get("reviewId") ?? ""),
    status,
  );
  revalidatePath("/admin/reviews");
}
