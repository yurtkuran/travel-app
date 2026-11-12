import Link from "next/link";

import { SignOutButton } from "@/features/auth/client/sign-out-button";
import type { CurrentSession } from "@/features/auth/server/session";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AccountMenu({ session }: { session: CurrentSession }) {
  return (
    <details className="account-menu">
      <summary>
        <span className="sr-only">Account menu for {session.name}</span>
        <span className="account-menu__avatar">{initials(session.name)}</span>
      </summary>
      <div className="account-menu__panel">
        <div className="account-menu__identity">
          <p className="account-menu__name">{session.name}</p>
          <p className="account-menu__email">{session.email}</p>
        </div>
        <Link className="nav-link" href="/account">
          Account
        </Link>
        <Link className="nav-link" href="/account/security">
          Security
        </Link>
        <SignOutButton variant="menu" />
      </div>
    </details>
  );
}
