import { NextResponse } from "next/server";

import { isSetupTokenUsable } from "@/features/auth/server/setup-tokens";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token") ?? "";
  const valid = await isSetupTokenUsable(token);
  const destination = new URL("/account/setup/complete", requestUrl);
  if (valid) destination.searchParams.set("token", token);
  else destination.searchParams.set("error", "invalid");
  const response = NextResponse.redirect(destination);

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");

  return response;
}
