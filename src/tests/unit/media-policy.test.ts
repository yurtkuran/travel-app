import { describe, expect, it } from "vitest";

import {
  mediaPolicy,
  MediaValidationError,
  validateMediaUploadMetadata,
} from "@/features/media/policy";

describe("media upload policy", () => {
  it("accepts supported image metadata within the byte limit", () => {
    expect(() =>
      validateMediaUploadMetadata({ size: 1, type: "image/png" }),
    ).not.toThrow();
  });

  it("rejects empty and oversized uploads before buffering", () => {
    expect(() =>
      validateMediaUploadMetadata({ size: 0, type: "image/png" }),
    ).toThrow(MediaValidationError);
    expect(() =>
      validateMediaUploadMetadata({
        size: mediaPolicy.maximumBytes + 1,
        type: "image/png",
      }),
    ).toThrow("Image must be 10 MB or smaller");
  });

  it("rejects unsupported declared media types", () => {
    expect(() =>
      validateMediaUploadMetadata({ size: 1024, type: "image/gif" }),
    ).toThrow("Upload a JPEG, PNG, or WebP image");
  });
});
