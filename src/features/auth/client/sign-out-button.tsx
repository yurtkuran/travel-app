"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "./auth-client";

export function SignOutButton({
  variant = "default",
}: {
  variant?: "default" | "menu";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      className={variant === "menu" ? "nav-link" : "button-secondary"}
      disabled={pending}
      onClick={signOut}
      type="button"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
