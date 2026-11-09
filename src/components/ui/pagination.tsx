import Link from "next/link";

function pageHref(
  pathname: string,
  page: number,
  query: Record<string, string | undefined>,
) {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) parameters.set(key, value);
  }
  if (page > 1) parameters.set("page", String(page));
  const search = parameters.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function Pagination({
  page,
  pageSize,
  pathname,
  query,
  total,
}: {
  page: number;
  pageSize: number;
  pathname: string;
  query: Record<string, string | undefined>;
  total: number;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const previous = page > 1;
  const next = page < pageCount;

  return (
    <nav aria-label="Pagination" className="pagination">
      <p>
        Page {Math.min(page, pageCount)} of {pageCount} · {total} total
      </p>
      <div>
        {previous ? (
          <Link
            className="button-secondary"
            href={pageHref(pathname, page - 1, query)}
          >
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className="button-secondary">
            Previous
          </span>
        )}
        {next ? (
          <Link
            className="button-secondary"
            href={pageHref(pathname, page + 1, query)}
          >
            Next
          </Link>
        ) : (
          <span aria-disabled="true" className="button-secondary">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
