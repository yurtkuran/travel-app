"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "./auth-client";

export function SignOutButton() {
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
      className="rounded-md border border-[var(--border)] bg-white px-4 py-2 font-semibold disabled:opacity-60"
      disabled={pending}
      onClick={signOut}
      type="button"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
