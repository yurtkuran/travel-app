import Link from "next/link";

export default function HomePage() {
  return (
    <div className="page-container">
      <section aria-labelledby="page-title" className="hero">
        <div>
          <p className="eyebrow">A personal travel archive</p>
          <h1 className="display-title" id="page-title">
            Keep track of places worth returning to.
          </h1>
          <p className="hero__lede">
            TravelTrove is a considered collection of memorable places, trusted
            recommendations, and the experiences you want to remember.
          </p>
          <div className="hero__actions">
            <Link className="button-primary" href="/places">
              Explore places
            </Link>
            <Link className="button-secondary" href="/cities">
              Browse by city
            </Link>
          </div>
        </div>
        <aside aria-label="Archive note" className="archive-note">
          <span className="archive-note__index">Archive · 01</span>
          <h2>Travel slowly. Remember well.</h2>
          <p>
            A quiet repository for restaurants, stays, shops, culture, and the
            small details that make a place worth sharing.
          </p>
        </aside>
      </section>
      <section className="section-rule section-intro">
        <h2>Built around discernment, not popularity.</h2>
        <p>
          Discover places through a curated archive, record private visits over
          time, and share thoughtful public reviews without turning travel into
          a competition.
        </p>
      </section>
    </div>
  );
}
