import { PublicShellPage } from "@/components/ui/public-shell-page";

export default async function PlacePage({
  params,
}: {
  params: Promise<{ placeId: string; slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PublicShellPage
      description="The canonical place view is ready for its gallery, public details, eligible review aggregates, and role-aware contribution actions."
      eyebrow="Place detail"
      title={slug.replaceAll("-", " ")}
    />
  );
}
