import { describe, expect, it } from "vitest";

import { isUsStateName, usStates } from "@/features/taxonomy/us-states";

describe("United States regions", () => {
  it("provides all states and the District of Columbia", () => {
    expect(usStates).toHaveLength(51);
    expect(new Set(usStates.map(({ code }) => code)).size).toBe(51);
    expect(usStates).toContainEqual({
      code: "DC",
      name: "District of Columbia",
    });
  });

  it("validates canonical state names", () => {
    expect(isUsStateName("New York")).toBe(true);
    expect(isUsStateName("Browser Region")).toBe(false);
  });
});
