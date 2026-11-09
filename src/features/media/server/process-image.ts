import "server-only";

import sharp from "sharp";

import { mediaPolicy, MediaValidationError } from "@/features/media/policy";

export interface ProcessedImage {
  display: Buffer;
  height: number;
  thumbnail: Buffer;
  width: number;
}

async function transformImage(input: Buffer): Promise<ProcessedImage> {
  if (!input.length)
    throw new MediaValidationError("Choose an image to upload");
  if (input.length > mediaPolicy.maximumBytes) {
    throw new MediaValidationError("Image must be 10 MB or smaller");
  }

  const source = sharp(input, {
    failOn: "error",
    limitInputPixels: mediaPolicy.maximumInputPixels,
  });
  const metadata = await source.metadata();
  if (
    !metadata.format ||
    !["jpeg", "png", "webp"].includes(metadata.format) ||
    !metadata.width ||
    !metadata.height
  ) {
    throw new MediaValidationError("Upload a valid JPEG, PNG, or WebP image");
  }

  const display = await source
    .clone()
    .rotate()
    .resize({
      fit: "inside",
      height: mediaPolicy.displayMaximumPixels,
      withoutEnlargement: true,
      width: mediaPolicy.displayMaximumPixels,
    })
    .webp({ effort: 5, quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const thumbnail = await source
    .clone()
    .rotate()
    .resize({
      fit: "cover",
      height: mediaPolicy.thumbnailMaximumPixels,
      width: mediaPolicy.thumbnailMaximumPixels,
    })
    .webp({ effort: 4, quality: 78 })
    .toBuffer();

  return {
    display: display.data,
    height: display.info.height,
    thumbnail,
    width: display.info.width,
  };
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  try {
    return await transformImage(input);
  } catch (error) {
    if (error instanceof MediaValidationError) throw error;
    throw new MediaValidationError(
      "The image could not be decoded safely as JPEG, PNG, or WebP",
    );
  }
}
