"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  admin: "Administration",
  audit: "Audit",
  categories: "Categories",
  cities: "Cities",
  new: "New",
  places: "Places",
  proposals: "Change proposals",
  reviews: "Reviews",
  submissions: "Submissions",
  users: "Users",
};

export function breadcrumbLabel(segment: string) {
  return labels[segment] ?? "Details";
}

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const current = index === segments.length - 1;
          return (
            <li key={href}>
              {current ? (
                <span aria-current="page">{breadcrumbLabel(segment)}</span>
              ) : (
                <Link href={href}>{breadcrumbLabel(segment)}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
