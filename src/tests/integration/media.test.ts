import { afterAll, beforeAll, describe, expect, test } from "vitest";
import sharp from "sharp";

import { getSqlClient } from "@/db/client";
import type { Actor } from "@/features/auth/permissions";
import { mediaPolicy, MediaValidationError } from "@/features/media/policy";
import {
  deletePlaceMedia,
  listPlaceMedia,
  reorderPlaceMedia,
  replacePlaceMedia,
  uploadPlaceMedia,
} from "@/features/media/server/media";
import {
  createTestCity,
  createTestPlace,
  createTestUser,
} from "../factories/database";

const sql = getSqlClient();
let admin: Actor;
let cityId: string;
let placeId: string;
let user: Actor;

async function image(red: number) {
  return sharp({
    create: {
      background: { alpha: 1, b: 20, g: 40, r: red },
      channels: 4,
      height: 720,
      width: 960,
    },
  })
    .png()
    .toBuffer();
}

describe("place media lifecycle", () => {
  beforeAll(async () => {
    const adminUser = await createTestUser(sql, "Media Admin");
    const normalUser = await createTestUser(sql, "Media User");
    const city = await createTestCity(sql);
    const place = await createTestPlace(sql, {
      cityId: city.id,
      createdByUserId: adminUser.id,
    });
    admin = { id: adminUser.id, role: "admin" };
    user = { id: normalUser.id, role: "user" };
    cityId = city.id;
    placeId = place.id;
  });
  afterAll(async () => {
    for (const item of await listPlaceMedia(placeId, "all"))
      await deletePlaceMedia(admin, placeId, item.id);
    await sql`delete from audit_events where target_type='media'`;
    await sql`delete from places where id=${placeId}`;
    await sql`delete from cities where id=${cityId}`;
    await sql`delete from "user" where id in ${sql([admin.id, user.id])}`;
    await sql.end();
  });

  test("rejects invalid content and missing accessible text", async () => {
    await expect(
      uploadPlaceMedia(admin, placeId, {
        altText: "Not an image",
        caption: "",
        contents: Buffer.from("not an image"),
        isDecorative: false,
        mimeType: "image/png",
      }),
    ).rejects.toBeInstanceOf(MediaValidationError);
    await expect(
      uploadPlaceMedia(admin, placeId, {
        altText: "",
        caption: "",
        contents: await image(100),
        isDecorative: false,
        mimeType: "image/png",
      }),
    ).rejects.toBeInstanceOf(MediaValidationError);
  });
  test("rejects oversized, unsupported, and misleading image uploads", async () => {
    await expect(
      uploadPlaceMedia(admin, placeId, {
        altText: "Oversized image",
        caption: "",
        contents: Buffer.alloc(mediaPolicy.maximumBytes + 1),
        isDecorative: false,
        mimeType: "image/png",
      }),
    ).rejects.toThrow("Image must be 10 MB or smaller");

    const validPng = await image(110);
    await expect(
      uploadPlaceMedia(admin, placeId, {
        altText: "Unsupported declared type",
        caption: "",
        contents: validPng,
        isDecorative: false,
        mimeType: "image/gif",
      }),
    ).rejects.toThrow("Upload a JPEG, PNG, or WebP image");

    const gifDisguisedAsPng = await sharp(validPng).gif().toBuffer();
    await expect(
      uploadPlaceMedia(admin, placeId, {
        altText: "Misleading image type",
        caption: "",
        contents: gifDisguisedAsPng,
        isDecorative: false,
        mimeType: "image/png",
      }),
    ).rejects.toBeInstanceOf(MediaValidationError);
    expect(await listPlaceMedia(placeId, "all")).toHaveLength(0);
  });
  test("does not let a user manage a published canonical place", async () => {
    await expect(
      uploadPlaceMedia(user, placeId, {
        altText: "Test",
        caption: "",
        contents: await image(120),
        isDecorative: false,
        mimeType: "image/png",
      }),
    ).rejects.toBeInstanceOf(MediaValidationError);
  });
  test("creates optimized display and thumbnail variants", async () => {
    await uploadPlaceMedia(admin, placeId, {
      altText: "A red test rectangle",
      caption: "Test caption",
      contents: await image(200),
      isDecorative: false,
      mimeType: "image/png",
    });
    const [item] = await listPlaceMedia(placeId, "all");
    expect(item).toMatchObject({
      altText: "A red test rectangle",
      caption: "Test caption",
      width: 960,
      height: 720,
    });
  });
  test("reorders and deletes media records with their files", async () => {
    await uploadPlaceMedia(admin, placeId, {
      altText: "Second image",
      caption: "",
      contents: await image(220),
      isDecorative: false,
      mimeType: "image/png",
    });
    const before = await listPlaceMedia(placeId, "all");
    expect(before).toHaveLength(2);
    await reorderPlaceMedia(admin, placeId, [before[1]!.id, before[0]!.id]);
    const after = await listPlaceMedia(placeId, "all");
    expect(after[0]?.id).toBe(before[1]?.id);
    const previousKey = after[0]!.storageKey;
    await replacePlaceMedia(
      admin,
      placeId,
      after[0]!.id,
      await image(240),
      "image/png",
    );
    expect((await listPlaceMedia(placeId, "all"))[0]?.storageKey).not.toBe(
      previousKey,
    );
    await deletePlaceMedia(admin, placeId, after[0]!.id);
    expect(await listPlaceMedia(placeId, "all")).toHaveLength(1);
  });
});
