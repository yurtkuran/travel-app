import type { CurrentSession } from "@/features/auth/server/session";

import { PublicFooter } from "./public-footer";
import { PublicHeader } from "./public-header";

export function PublicShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: CurrentSession | null;
}) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <PublicHeader session={session} />
      <main className="public-main" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <PublicFooter />
    </>
  );
}
