export default function PublicLoadingPage() {
  return (
    <main aria-busy="true" aria-live="polite" className="system-state">
      <div className="system-state__content">
        <p className="eyebrow">TravelTrove</p>
        <h1>Opening the archive…</h1>
        <div aria-hidden="true" className="loading-line" />
      </div>
    </main>
  );
}
