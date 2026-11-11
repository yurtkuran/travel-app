import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";

import { getSqlClient } from "@/db/client";
import { hasCapability, type Actor } from "@/features/auth/permissions";
import {
  mediaPolicy,
  MediaValidationError,
  validateMediaUploadMetadata,
} from "@/features/media/policy";

import { processImage } from "./process-image";
import { getMediaStorage } from "./storage";

const metadataSchema = z.object({
  altText: z
    .string()
    .trim()
    .max(500)
    .transform((value) => value || null),
  caption: z
    .string()
    .trim()
    .max(500)
    .transform((value) => value || null),
  isDecorative: z.boolean(),
});

export interface MediaItem {
  altText: string | null;
  caption: string | null;
  displayOrder: number;
  height: number;
  id: string;
  isDecorative: boolean;
  storageKey: string;
  width: number;
}

export const mediaUrl = (storageKey: string) =>
  getMediaStorage().getUrl(storageKey);
export const thumbnailKey = (storageKey: string) =>
  storageKey.replace(/\/display\.webp$/, "/thumbnail.webp");
export const thumbnailUrl = (storageKey: string) =>
  mediaUrl(thumbnailKey(storageKey));

export async function isPublishedMediaKey(storageKey: string) {
  const displayKey = storageKey.endsWith("/thumbnail.webp")
    ? storageKey.replace(/\/thumbnail\.webp$/, "/display.webp")
    : storageKey.endsWith("/display.webp")
      ? storageKey
      : null;
  if (!displayKey) return false;

  const [result] = await getSqlClient()<{ visible: boolean }[]>`
    select exists(
      select 1
        from media
        join places on places.id = media.place_id
       where media.storage_key = ${displayKey}
         and media.status = 'published'
         and places.status = 'published'
    ) as visible
  `;
  return result?.visible ?? false;
}

async function assertCanManage(actor: Actor, placeId: string) {
  const [place] = await getSqlClient()<
    {
      createdByUserId: string | null;
      status: string;
      submittedByUserId: string | null;
    }[]
  >`
    select created_by_user_id as "createdByUserId", submitted_by_user_id as "submittedByUserId", status
      from places where id = ${placeId}
  `;
  if (!place) throw new MediaValidationError("Place not found");
  const admin = hasCapability(actor.role, "places.manageAny");
  const ownsDraft =
    place.status === "draft" &&
    (place.createdByUserId === actor.id ||
      place.submittedByUserId === actor.id);
  if (!admin && !ownsDraft) {
    throw new MediaValidationError("You cannot manage images for this place");
  }
  return place;
}

export async function listPlaceMedia(
  placeId: string,
  status: "all" | "published" = "published",
) {
  const sql = getSqlClient();
  return sql<MediaItem[]>`
    select id, storage_key as "storageKey", width, height, caption,
           alt_text as "altText", is_decorative as "isDecorative",
           display_order as "displayOrder"
      from media
     where place_id = ${placeId}
       and (${status} = 'all' or status = 'published')
     order by display_order, created_at, id
  `;
}

export async function uploadPlaceMedia(
  actor: Actor,
  placeId: string,
  input: {
    altText: string;
    caption: string;
    contents: Buffer;
    isDecorative: boolean;
    mimeType: string;
  },
) {
  const place = await assertCanManage(actor, placeId);
  const metadata = metadataSchema.parse(input);
  validateMediaUploadMetadata({
    size: input.contents.length,
    type: input.mimeType,
  });
  if (!metadata.isDecorative && !metadata.altText) {
    throw new MediaValidationError(
      "Alternative text is required unless the image is decorative",
    );
  }
  const sql = getSqlClient();
  const [total] = await sql<{ count: number }[]>`
    select count(*)::integer as count from media where place_id = ${placeId}
  `;
  if ((total?.count ?? 0) >= mediaPolicy.maximumImagesPerPlace) {
    throw new MediaValidationError(
      `A place may have at most ${mediaPolicy.maximumImagesPerPlace} images`,
    );
  }

  const processed = await processImage(input.contents);
  const mediaId = randomUUID();
  const base = `places/${placeId}/${mediaId}`;
  const displayKey = `${base}/display.webp`;
  const thumbKey = `${base}/thumbnail.webp`;
  const storage = getMediaStorage();
  const written: string[] = [];
  try {
    await storage.put(displayKey, processed.display);
    written.push(displayKey);
    await storage.put(thumbKey, processed.thumbnail);
    written.push(thumbKey);
    await sql.begin(async (transaction) => {
      const [order] = await transaction<{ nextOrder: number }[]>`
        select coalesce(max(display_order), -1) + 1 as "nextOrder" from media where place_id = ${placeId}
      `;
      await transaction`
        insert into media (id, place_id, uploaded_by_user_id, storage_key, mime_type, width, height, caption, alt_text, is_decorative, display_order, status)
        values (${mediaId}, ${placeId}, ${actor.id}, ${displayKey}, 'image/webp', ${processed.width}, ${processed.height}, ${metadata.caption}, ${metadata.altText}, ${metadata.isDecorative}, ${order?.nextOrder ?? 0}, ${place.status === "published" ? "published" : "draft"})
      `;
      await transaction`
        insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
        values ('user', ${actor.id}, 'media.uploaded', 'media', ${mediaId})
      `;
    });
    return { id: mediaId };
  } catch (error) {
    await Promise.allSettled(written.map((key) => storage.delete(key)));
    throw error;
  }
}

export async function deletePlaceMedia(
  actor: Actor,
  placeId: string,
  mediaId: string,
) {
  await assertCanManage(actor, placeId);
  const storage = getMediaStorage();
  const storageKey = await getSqlClient().begin(async (transaction) => {
    const [item] = await transaction<{ storageKey: string }[]>`
      delete from media where id = ${mediaId} and place_id = ${placeId}
      returning storage_key as "storageKey"
    `;
    if (!item) throw new MediaValidationError("Image not found");
    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
      values ('user', ${actor.id}, 'media.deleted', 'media', ${mediaId})
    `;
    return item.storageKey;
  });
  await storage.delete(storageKey);
  await storage.delete(thumbnailKey(storageKey));
}

export async function reorderPlaceMedia(
  actor: Actor,
  placeId: string,
  orderedIds: string[],
) {
  await assertCanManage(actor, placeId);
  await getSqlClient().begin(async (transaction) => {
    const existing = await transaction<{ id: string }[]>`
      select id from media where place_id = ${placeId} for update
    `;
    const actual = new Set(existing.map(({ id }) => id));
    if (
      actual.size !== orderedIds.length ||
      orderedIds.some((id) => !actual.has(id))
    ) {
      throw new MediaValidationError("Image order is incomplete or invalid");
    }
    for (const [index, id] of orderedIds.entries()) {
      await transaction`
        update media set display_order = ${index}, updated_at = now()
         where id = ${id} and place_id = ${placeId}
      `;
    }
  });
}

export async function replacePlaceMedia(
  actor: Actor,
  placeId: string,
  mediaId: string,
  contents: Buffer,
  mimeType: string,
) {
  await assertCanManage(actor, placeId);
  validateMediaUploadMetadata({ size: contents.length, type: mimeType });
  const processed = await processImage(contents);
  const base = `places/${placeId}/${randomUUID()}`;
  const displayKey = `${base}/display.webp`;
  const thumbKey = `${base}/thumbnail.webp`;
  const storage = getMediaStorage();
  const written: string[] = [];
  let oldKey: string;
  try {
    await storage.put(displayKey, processed.display);
    written.push(displayKey);
    await storage.put(thumbKey, processed.thumbnail);
    written.push(thumbKey);
    oldKey = await getSqlClient().begin(async (transaction) => {
      const [item] = await transaction<{ storageKey: string }[]>`
        select storage_key as "storageKey" from media
         where id = ${mediaId} and place_id = ${placeId}
         for update
      `;
      if (!item) throw new MediaValidationError("Image not found");
      await transaction`
        update media set storage_key = ${displayKey}, width = ${processed.width}, height = ${processed.height}, mime_type = 'image/webp', updated_at = now()
         where id = ${mediaId}
      `;
      await transaction`
        insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
        values ('user', ${actor.id}, 'media.replaced', 'media', ${mediaId})
      `;
      return item.storageKey;
    });
  } catch (error) {
    await Promise.allSettled(written.map((key) => storage.delete(key)));
    throw error;
  }
  await storage.delete(oldKey);
  await storage.delete(thumbnailKey(oldKey));
}
