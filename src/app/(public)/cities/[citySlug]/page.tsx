import { PublicShellPage } from "@/components/ui/public-shell-page";

export default async function CityPage({
  params,
}: {
  params: Promise<{ citySlug: string }>;
}) {
  const { citySlug } = await params;
  return (
    <PublicShellPage
      description="Published places in this city will use the same public filters and privacy-safe rating summaries as the main archive."
      eyebrow="City archive"
      title={citySlug.replaceAll("-", " ")}
    />
  );
}
