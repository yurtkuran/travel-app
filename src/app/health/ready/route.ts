import { NextResponse } from "next/server";

import { checkDatabaseConnection } from "@/db/client";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    await checkDatabaseConnection();
    return NextResponse.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("readiness_check_failed", { error });
    return NextResponse.json(
      { status: "not_ready" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
