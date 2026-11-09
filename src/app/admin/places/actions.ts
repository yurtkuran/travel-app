"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/features/auth/server/session";
import {
  createCanonicalPlace,
  setPlacePublication,
  updateCanonicalPlace,
} from "@/features/places/server/management";
const input = (formData: FormData) => ({
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
});
export async function createPlaceAction(formData: FormData) {
  const session = await requireAdminSession();
  const place = await createCanonicalPlace(session.actor, input(formData));
  revalidatePath("/admin/places");
  redirect(`/admin/places/${place.id}?created=true`);
}
export async function updatePlaceAction(formData: FormData) {
  const session = await requireAdminSession();
  const id = String(formData.get("placeId") ?? "");
  await updateCanonicalPlace(session.actor, id, input(formData));
  revalidatePath("/admin/places");
  redirect(`/admin/places/${id}?updated=true`);
}
export async function publicationAction(formData: FormData) {
  const session = await requireAdminSession();
  const id = String(formData.get("placeId") ?? "");
  const publish = formData.get("intent") === "publish";
  await setPlacePublication(session.actor, id, publish);
  revalidatePath("/admin/places");
  redirect(
    `/admin/places/${id}?publication=${publish ? "published" : "unpublished"}`,
  );
}
