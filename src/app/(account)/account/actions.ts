"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  AccountSelfServiceError,
  changeOwnPassword,
  revokeOwnSession,
  updateOwnProfile,
} from "@/features/auth/server/account-self-service";
import { requireCurrentSession } from "@/features/auth/server/session";

export async function updateProfileAction(formData: FormData) {
  const session = await requireCurrentSession("/account");
  try {
    await updateOwnProfile(session.actor, {
      name: String(formData.get("name") ?? ""),
    });
  } catch (error) {
    redirect(
      `/account?error=${error instanceof z.ZodError ? "invalid" : "failed"}`,
    );
  }
  redirect("/account?updated=true");
}

export async function changePasswordAction(formData: FormData) {
  const session = await requireCurrentSession("/account/security");
  try {
    await changeOwnPassword(session.actor, session.sessionId, {
      confirmation: String(formData.get("confirmation") ?? ""),
      currentPassword: String(formData.get("currentPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
    });
  } catch (error) {
    const code =
      error instanceof z.ZodError
        ? "invalid"
        : error instanceof AccountSelfServiceError
          ? "incorrect"
          : "failed";
    redirect(`/account/security?error=${code}`);
  }
  redirect("/account/security?updated=password");
}

export async function revokeSessionAction(formData: FormData) {
  const session = await requireCurrentSession("/account/security");
  try {
    await revokeOwnSession(
      session.actor,
      String(formData.get("sessionId") ?? ""),
      session.sessionId,
    );
  } catch {
    redirect("/account/security?error=session");
  }
  redirect("/account/security?updated=session");
}
