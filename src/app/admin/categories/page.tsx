import { AdminShellPage } from "@/components/ui/admin-shell-page";

export default function AdminCategoriesPage() {
  return (
    <AdminShellPage
      description="Manage public categories and the optional rating dimensions each category supports."
      emptyDescription="Seeded categories and rating capabilities will appear here when management queries are connected."
      emptyTitle="Categories ready to load"
      eyebrow="Taxonomy"
      title="Manage categories"
    />
  );
}
