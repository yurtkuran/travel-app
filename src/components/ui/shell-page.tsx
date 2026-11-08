import { PageHeading } from "./page-heading";
import { EmptyState } from "./empty-state";

export interface ShellPageProps {
  action?: React.ReactNode;
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  eyebrow: string;
  title: string;
}

export function ShellPage({
  action,
  description,
  emptyDescription,
  emptyTitle,
  eyebrow,
  title,
}: ShellPageProps) {
  return (
    <>
      <PageHeading
        action={action}
        description={description}
        eyebrow={eyebrow}
        title={title}
      />
      <EmptyState description={emptyDescription} title={emptyTitle} />
    </>
  );
}
