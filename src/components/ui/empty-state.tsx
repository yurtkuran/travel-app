export function EmptyState({
  description,
  eyebrow = "Ready for the first entry",
  title,
}: {
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="empty-state">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </section>
  );
}
