import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="page-container public-footer__inner">
        <div>
          <Link className="wordmark" href="/">
            TravelTrove
          </Link>
          <p>A considered archive of places worth remembering.</p>
        </div>
        <p>Built for curious, discerning travelers.</p>
      </div>
    </footer>
  );
}
