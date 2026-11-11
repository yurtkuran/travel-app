"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  AccountAdministrationError,
  changeUserRole,
  deleteUserAccount,
  setUserSuspended,
} from "@/features/auth/server/account-administration";
import { getAdminUser } from "@/features/auth/server/administration-queries";
import { requireFreshAdminSession } from "@/features/auth/server/session";
import {
  createRecoveryLink,
  provisionUser,
  SetupTokenError,
} from "@/features/auth/server/setup-tokens";

import type { LinkActionState } from "./action-state";

function userId(formData: FormData) {
  const id = String(formData.get("userId") ?? "");
  if (!id) redirect("/admin/users");
  return id;
}

function managementError(error: unknown) {
  return error instanceof AccountAdministrationError
    ? error.message
    : "The account could not be updated.";
}

export async function provisionUserAction(
  _previous: LinkActionState,
  formData: FormData,
): Promise<LinkActionState> {
  const session = await requireFreshAdminSession();
  try {
    const result = await provisionUser(session.actor, {
      email: String(formData.get("email") ?? ""),
      name: String(formData.get("name") ?? ""),
    });
    return {
      expiresAt: result.expiresAt,
      message:
        "The account was provisioned. Copy this setup link now; it cannot be shown again.",
      setupUrl: result.setupUrl,
      status: "success",
      userId: result.userId,
    };
  } catch (error) {
    const duplicate =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505";
    return {
      message:
        error instanceof z.ZodError
          ? "Enter a valid name and email address."
          : duplicate
            ? "An account with that email address already exists."
            : "The account could not be provisioned.",
      status: "error",
    };
  }
}

export async function recoveryLinkAction(
  _previous: LinkActionState,
  formData: FormData,
): Promise<LinkActionState> {
  const session = await requireFreshAdminSession();
  const id = userId(formData);
  try {
    const result = await createRecoveryLink(session.actor, id);
    return {
      expiresAt: result.expiresAt,
      message:
        "A new recovery link was generated and all existing sessions were revoked. Copy it now.",
      setupUrl: result.setupUrl,
      status: "success",
      userId: id,
    };
  } catch (error) {
    return {
      message:
        error instanceof SetupTokenError
          ? "Recovery is unavailable for this account."
          : "The recovery link could not be generated.",
      status: "error",
      userId: id,
    };
  }
}

export async function changeRoleAction(formData: FormData) {
  const session = await requireFreshAdminSession();
  const id = userId(formData);
  const role = formData.get("role") === "admin" ? "admin" : "user";
  try {
    await changeUserRole(session.actor, id, role);
  } catch (error) {
    redirect(
      `/admin/users/${encodeURIComponent(id)}?error=${encodeURIComponent(managementError(error))}`,
    );
  }
  redirect(`/admin/users/${encodeURIComponent(id)}?updated=role`);
}

export async function setSuspensionAction(formData: FormData) {
  const session = await requireFreshAdminSession();
  const id = userId(formData);
  const suspended = formData.get("suspended") === "true";
  try {
    await setUserSuspended(
      session.actor,
      id,
      suspended,
      String(formData.get("reason") ?? ""),
    );
  } catch (error) {
    redirect(
      `/admin/users/${encodeURIComponent(id)}?error=${encodeURIComponent(managementError(error))}`,
    );
  }
  redirect(
    `/admin/users/${encodeURIComponent(id)}?updated=${suspended ? "suspended" : "restored"}`,
  );
}

export async function deleteUserAction(formData: FormData) {
  const session = await requireFreshAdminSession();
  const id = userId(formData);
  const target = await getAdminUser(session.actor, id);
  if (!target || String(formData.get("confirmation") ?? "") !== target.email) {
    redirect(`/admin/users/${encodeURIComponent(id)}?error=confirmation`);
  }
  try {
    await deleteUserAccount(session.actor, id);
  } catch (error) {
    redirect(
      `/admin/users/${encodeURIComponent(id)}?error=${encodeURIComponent(managementError(error))}`,
    );
  }
  redirect("/admin/users?deleted=true");
}
