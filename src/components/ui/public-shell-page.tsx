export function PublicShellPage({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="page-container shell-content">
      <header className="page-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="page-heading__description">{description}</p>
        </div>
      </header>
      <EmptyState
        description="This route is ready for the first curated entries in the core vertical slice."
        eyebrow="The archive is taking shape"
        title="No published places yet"
      />
    </div>
  );
}
import { EmptyState } from "./empty-state";
