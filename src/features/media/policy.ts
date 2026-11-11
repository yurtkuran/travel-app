export const mediaPolicy = {
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  displayMaximumPixels: 1600,
  maximumBytes: 10 * 1024 * 1024,
  maximumImagesPerPlace: 12,
  maximumInputPixels: 40_000_000,
  outputMimeType: "image/webp",
  thumbnailMaximumPixels: 480,
} as const;

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export function validateMediaUploadMetadata({
  size,
  type,
}: {
  size: number;
  type: string;
}) {
  if (size <= 0) throw new MediaValidationError("Choose an image to upload");
  if (size > mediaPolicy.maximumBytes) {
    throw new MediaValidationError("Image must be 10 MB or smaller");
  }
  if (!(mediaPolicy.acceptedMimeTypes as readonly string[]).includes(type)) {
    throw new MediaValidationError("Upload a JPEG, PNG, or WebP image");
  }
}
