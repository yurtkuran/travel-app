import Link from "next/link";

import type { CurrentSession } from "@/features/auth/server/session";

import { NavLink } from "../navigation/nav-link";
import { AccountMenu } from "./account-menu";

export function PublicHeader({ session }: { session: CurrentSession | null }) {
  return (
    <header className="app-header">
      <div className="app-header__inner page-container">
        <Link className="wordmark" href="/">
          TravelTrove
        </Link>
        <nav aria-label="Primary navigation" className="primary-nav">
          <NavLink href="/places">Explore</NavLink>
          <NavLink href="/cities">Cities</NavLink>
          <NavLink href="/categories">Categories</NavLink>
          {session?.actor.role === "admin" ? (
            <NavLink href="/admin">Administration</NavLink>
          ) : null}
        </nav>
        <div className="header-actions">
          {session ? (
            <>
              <NavLink href="/my">My activity</NavLink>
              <Link className="button-secondary" href="/my/submissions/new">
                Add a place
              </Link>
              <AccountMenu session={session} />
            </>
          ) : (
            <Link className="button-secondary" href="/sign-in">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
