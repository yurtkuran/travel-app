import type { CurrentSession } from "@/features/auth/server/session";

import { AdminBreadcrumbs } from "../navigation/admin-breadcrumbs";
import { NavLink } from "../navigation/nav-link";
import { PublicHeader } from "./public-header";

export function AdminShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: CurrentSession;
}) {
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <PublicHeader session={session} />
      <div className="admin-frame">
        <aside className="admin-sidebar">
          <nav aria-label="Administration navigation" className="admin-nav">
            <div className="admin-nav__group">
              <p className="admin-nav__label">Workspace</p>
              <NavLink exact href="/admin">
                Overview
              </NavLink>
              <NavLink href="/admin/places">Places</NavLink>
              <NavLink href="/admin/submissions">Submissions</NavLink>
              <NavLink href="/admin/proposals">Change proposals</NavLink>
            </div>
            <div className="admin-nav__group">
              <p className="admin-nav__label">Management</p>
              <NavLink href="/admin/cities">Cities</NavLink>
              <NavLink href="/admin/categories">Categories</NavLink>
              <NavLink href="/admin/reviews">Reviews</NavLink>
              <NavLink href="/admin/users">Users</NavLink>
              <NavLink href="/admin/audit">Audit</NavLink>
            </div>
          </nav>
        </aside>
        <main className="admin-content" id="main-content">
          <AdminBreadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
