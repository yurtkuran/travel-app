"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireAdminSession } from "@/features/auth/server/session";
import {
  MediaValidationError,
  validateMediaUploadMetadata,
} from "@/features/media/policy";
import {
  deletePlaceMedia,
  listPlaceMedia,
  reorderPlaceMedia,
  replacePlaceMedia,
  uploadPlaceMedia,
} from "@/features/media/server/media";
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
  latitude: String(formData.get("latitude") ?? ""),
  longitude: String(formData.get("longitude") ?? ""),
  mapListing: String(formData.get("mapListing") ?? ""),
  name: String(formData.get("name") ?? ""),
  officialWebsite: String(formData.get("officialWebsite") ?? ""),
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

export async function uploadMediaAction(formData: FormData) {
  const session = await requireAdminSession();
  const placeId = String(formData.get("placeId") ?? "");
  const file = formData.get("image");
  if (!(file instanceof File)) throw new Error("Choose an image to upload");
  try {
    validateMediaUploadMetadata(file);
    await uploadPlaceMedia(session.actor, placeId, {
      altText: String(formData.get("altText") ?? ""),
      caption: String(formData.get("caption") ?? ""),
      contents: Buffer.from(await file.arrayBuffer()),
      isDecorative: formData.get("isDecorative") === "on",
      mimeType: file.type,
    });
  } catch (error) {
    if (error instanceof MediaValidationError || error instanceof ZodError) {
      redirect(`/admin/places/${placeId}?media=invalid`);
    }
    throw error;
  }
  revalidatePath(`/admin/places/${placeId}`);
  redirect(`/admin/places/${placeId}?media=uploaded`);
}

export async function deleteMediaAction(formData: FormData) {
  const session = await requireAdminSession();
  const placeId = String(formData.get("placeId") ?? "");
  await deletePlaceMedia(
    session.actor,
    placeId,
    String(formData.get("mediaId") ?? ""),
  );
  revalidatePath(`/admin/places/${placeId}`);
  redirect(`/admin/places/${placeId}?media=deleted`);
}

export async function moveMediaAction(formData: FormData) {
  const session = await requireAdminSession();
  const placeId = String(formData.get("placeId") ?? "");
  const mediaId = String(formData.get("mediaId") ?? "");
  const direction = formData.get("direction") === "earlier" ? -1 : 1;
  const items = await listPlaceMedia(placeId, "all");
  const index = items.findIndex(({ id }) => id === mediaId);
  const target = index + direction;
  if (index >= 0 && target >= 0 && target < items.length) {
    const ids = items.map(({ id }) => id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    await reorderPlaceMedia(session.actor, placeId, ids);
  }
  revalidatePath(`/admin/places/${placeId}`);
  redirect(`/admin/places/${placeId}?media=reordered`);
}

export async function replaceMediaAction(formData: FormData) {
  const session = await requireAdminSession();
  const placeId = String(formData.get("placeId") ?? "");
  const file = formData.get("replacement");
  if (!(file instanceof File)) throw new Error("Choose a replacement image");
  try {
    validateMediaUploadMetadata(file);
    await replacePlaceMedia(
      session.actor,
      placeId,
      String(formData.get("mediaId") ?? ""),
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
  } catch (error) {
    if (error instanceof MediaValidationError) {
      redirect(`/admin/places/${placeId}?media=invalid`);
    }
    throw error;
  }
  revalidatePath(`/admin/places/${placeId}`);
  redirect(`/admin/places/${placeId}?media=replaced`);
}
