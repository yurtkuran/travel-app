export const roles = ["user", "admin"] as const;
export type Role = (typeof roles)[number];

export const capabilities = [
  "places.readPublished",
  "reviews.readPublic",
  "account.manageOwn",
  "visits.manageOwn",
  "reviews.manageOwn",
  "submissions.createOwn",
  "submissions.manageOwn",
  "proposals.createOwn",
  "proposals.manageOwn",
  "places.publish",
  "places.manageAny",
  "submissions.moderate",
  "proposals.moderate",
  "taxonomy.manage",
  "reviews.moderate",
  "users.manage",
  "operations.manage",
] as const;

export type Capability = (typeof capabilities)[number];
export type AccessRole = Role | "guest";

const guestCapabilities = new Set<Capability>([
  "places.readPublished",
  "reviews.readPublic",
]);

const userCapabilities = new Set<Capability>([
  ...guestCapabilities,
  "account.manageOwn",
  "visits.manageOwn",
  "reviews.manageOwn",
  "submissions.createOwn",
  "submissions.manageOwn",
  "proposals.createOwn",
  "proposals.manageOwn",
]);

const adminCapabilities = new Set<Capability>([
  ...userCapabilities,
  "places.publish",
  "places.manageAny",
  "submissions.moderate",
  "proposals.moderate",
  "taxonomy.manage",
  "reviews.moderate",
  "users.manage",
  "operations.manage",
]);

const capabilitySets: Record<AccessRole, ReadonlySet<Capability>> = {
  guest: guestCapabilities,
  user: userCapabilities,
  admin: adminCapabilities,
};

export interface Actor {
  id: string;
  role: Role;
}

export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN";

  constructor(message = "You are not authorized to perform this action") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role);
}

export function hasCapability(
  role: AccessRole,
  capability: Capability,
): boolean {
  return capabilitySets[role].has(capability);
}

export function requireCapability(actor: Actor, capability: Capability): void {
  if (!hasCapability(actor.role, capability)) throw new AuthorizationError();
}

export function requireOwnership(actor: Actor, ownerId: string): void {
  if (actor.id !== ownerId)
    throw new AuthorizationError("This private record belongs to another user");
}

export function requireOwnedCapability(
  actor: Actor,
  ownerId: string,
  capability: Capability,
): void {
  requireCapability(actor, capability);
  requireOwnership(actor, ownerId);
}

export function canReadSubmission(actor: Actor, ownerId: string): boolean {
  return (
    (actor.id === ownerId &&
      hasCapability(actor.role, "submissions.manageOwn")) ||
    hasCapability(actor.role, "submissions.moderate")
  );
}
