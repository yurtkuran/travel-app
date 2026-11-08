type StatusTone = "critical" | "neutral" | "positive" | "warning";

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  return (
    <span className={`status-badge status-badge--${tone}`}>{children}</span>
  );
}
