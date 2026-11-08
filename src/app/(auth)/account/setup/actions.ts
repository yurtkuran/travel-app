"use server";

import { redirect } from "next/navigation";

import { consumeSetupToken } from "@/features/auth/server/setup-tokens";

export async function completeAccountSetup(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");
  const token = String(formData.get("token") ?? "");

  if (
    !token ||
    password !== confirmation ||
    password.length < 12 ||
    password.length > 128
  ) {
    redirect("/account/setup?error=invalid");
  }

  try {
    await consumeSetupToken(token, password);
  } catch {
    redirect("/account/setup?error=invalid");
  }

  redirect("/sign-in?setup=complete");
}
