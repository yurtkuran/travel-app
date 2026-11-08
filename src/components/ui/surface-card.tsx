export function SurfaceCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={["surface-card", className].filter(Boolean).join(" ")}>
      {children}
    </article>
  );
}
