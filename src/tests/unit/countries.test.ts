import { describe, expect, it } from "vitest";

import {
  countries,
  countryNameForCode,
  isIsoCountryCode,
} from "@/features/taxonomy/countries";

describe("country taxonomy", () => {
  it("provides the complete ISO 3166-1 country list", () => {
    expect(countries).toHaveLength(249);
    expect(new Set(countries.map(({ code }) => code)).size).toBe(249);
    expect(countries[0]).toEqual({ code: "US", name: "United States" });
  });

  it("derives canonical display names from country codes", () => {
    expect(countryNameForCode("us")).toBe("United States");
    expect(countryNameForCode("FR")).toBe("France");
  });

  it("rejects unknown and non-country region codes", () => {
    expect(isIsoCountryCode("US")).toBe(true);
    expect(isIsoCountryCode("EU")).toBe(false);
    expect(isIsoCountryCode("XX")).toBe(false);
  });
});
