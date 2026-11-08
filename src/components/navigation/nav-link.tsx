"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  children,
  exact = false,
  href,
}: {
  children: React.ReactNode;
  exact?: boolean;
  href: string;
}) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className="nav-link"
      href={href}
    >
      {children}
    </Link>
  );
}
