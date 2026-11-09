import { NextResponse } from "next/server";

import { getMediaStorage } from "@/features/media/server/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  try {
    const contents = await getMediaStorage().get((await params).key.join("/"));
    return new NextResponse(new Uint8Array(contents), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new NextResponse(null, { status: 404 });
    }
    throw error;
  }
}
