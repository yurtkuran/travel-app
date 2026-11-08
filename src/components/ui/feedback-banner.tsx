type FeedbackTone = "error" | "info" | "success" | "warning";

export function FeedbackBanner({
  children,
  title,
  tone = "info",
}: {
  children: React.ReactNode;
  title?: string;
  tone?: FeedbackTone;
}) {
  return (
    <div
      className={`feedback-banner feedback-banner--${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {title ? <p className="feedback-banner__title">{title}</p> : null}
      <div className="feedback-banner__body">{children}</div>
    </div>
  );
}
