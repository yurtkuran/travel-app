export function PageHeading({
  action,
  description,
  eyebrow,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-heading__description">{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </header>
  );
}
