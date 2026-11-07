import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  canReadSubmission,
  hasCapability,
  requireOwnedCapability,
  type Actor,
} from "@/features/auth/permissions";

describe("authorization policy", () => {
  const user: Actor = { id: "user-1", role: "user" };
  const admin: Actor = { id: "admin-1", role: "admin" };

  it("gives guests only public capabilities", () => {
    expect(hasCapability("guest", "places.readPublished")).toBe(true);
    expect(hasCapability("guest", "visits.manageOwn")).toBe(false);
    expect(hasCapability("guest", "users.manage")).toBe(false);
  });

  it("prevents ordinary users from administrative actions", () => {
    expect(hasCapability("user", "places.publish")).toBe(false);
    expect(hasCapability("user", "reviews.moderate")).toBe(false);
    expect(hasCapability("user", "users.manage")).toBe(false);
  });

  it("does not let an admin bypass private visit ownership", () => {
    expect(() =>
      requireOwnedCapability(admin, user.id, "visits.manageOwn"),
    ).toThrow(AuthorizationError);
  });

  it("allows admins to moderate submissions without changing private ownership rules", () => {
    expect(canReadSubmission(user, user.id)).toBe(true);
    expect(canReadSubmission(user, "user-2")).toBe(false);
    expect(canReadSubmission(admin, user.id)).toBe(true);
  });
});
