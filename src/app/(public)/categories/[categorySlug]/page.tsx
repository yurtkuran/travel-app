import { PublicShellPage } from "@/components/ui/public-shell-page";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;
  return (
    <PublicShellPage
      description="Published places in this category will include only eligible public review aggregates and approved attribution."
      eyebrow="Category archive"
      title={categorySlug.replaceAll("-", " ")}
    />
  );
}
