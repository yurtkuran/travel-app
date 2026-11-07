import "server-only";

import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";

import { isRole, type Actor } from "@/features/auth/permissions";

import { getAuth } from "./auth";

export interface CurrentSession {
  actor: Actor;
  email: string;
  name: string;
  sessionCreatedAt: Date;
  sessionId: string;
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  const result = await getAuth().api.getSession({ headers: await headers() });
  if (!result || !isRole(result.user.role)) return null;

  return {
    actor: { id: result.user.id, role: result.user.role },
    email: result.user.email,
    name: result.user.name,
    sessionCreatedAt: result.session.createdAt,
    sessionId: result.session.id,
  };
}

export async function requireCurrentSession(
  returnTo: string,
): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  return session;
}

export async function requireAdminSession(): Promise<CurrentSession> {
  const session = await requireCurrentSession("/admin");
  if (session.actor.role !== "admin") forbidden();
  return session;
}

export async function requireFreshAdminSession(): Promise<CurrentSession> {
  const session = await requireAdminSession();
  if (Date.now() - session.sessionCreatedAt.getTime() > 15 * 60 * 1000) {
    redirect("/sign-in?returnTo=%2Fadmin&fresh=required");
  }
  return session;
}
