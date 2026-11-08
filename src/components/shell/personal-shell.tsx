import type { CurrentSession } from "@/features/auth/server/session";

import { NavLink } from "../navigation/nav-link";
import { PublicHeader } from "./public-header";

export function PersonalShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: CurrentSession;
}) {
  return (
    <div className="personal-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <PublicHeader session={session} />
      <div className="personal-shell__nav">
        <nav aria-label="Personal navigation" className="page-container subnav">
          <NavLink exact href="/my">
            Overview
          </NavLink>
          <NavLink href="/my/visits">Visits</NavLink>
          <NavLink href="/my/reviews">Reviews</NavLink>
          <NavLink href="/my/submissions">Submissions</NavLink>
          <NavLink href="/my/proposals">Proposed edits</NavLink>
        </nav>
      </div>
      <main className="page-container shell-content" id="main-content">
        {children}
      </main>
    </div>
  );
}
