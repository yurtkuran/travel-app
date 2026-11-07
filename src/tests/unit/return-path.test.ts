import { describe, expect, it } from "vitest";

import { safeReturnPath } from "@/features/auth/return-path";

describe("safe return paths", () => {
  it("accepts a same-origin application path", () => {
    expect(safeReturnPath("/my?tab=visits#recent")).toBe(
      "/my?tab=visits#recent",
    );
  });

  it.each([
    "https://evil.example",
    "//evil.example/path",
    "javascript:alert(1)",
  ])("rejects unsafe return path %s", (value) => {
    expect(safeReturnPath(value)).toBe("/my");
  });
});
