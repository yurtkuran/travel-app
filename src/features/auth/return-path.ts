export function safeReturnPath(
  value: string | string[] | undefined,
  fallback = "/my",
): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate?.startsWith("/") || candidate.startsWith("//"))
    return fallback;

  try {
    const url = new URL(candidate, "https://traveltrove.invalid");
    if (url.origin !== "https://traveltrove.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
