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
