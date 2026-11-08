import Link from "next/link";

export function AuthShell({
  children,
  description,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <main className="auth-shell">
      <section className="auth-shell__context">
        <Link className="wordmark" href="/">
          TravelTrove
        </Link>
        <div className="auth-shell__note">
          <p className="eyebrow">A private, considered archive</p>
          <h2>Remember the places that shape a journey.</h2>
          <p>
            Invitation-only access keeps personal visits private and community
            contributions intentional.
          </p>
        </div>
      </section>
      <section className="auth-shell__form">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="auth-shell__description">{description}</p>
        {children}
      </section>
    </main>
  );
}
