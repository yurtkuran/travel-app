import { NextResponse } from "next/server";

import { isPublishedMediaKey } from "@/features/media/server/media";
import { getMediaStorage } from "@/features/media/server/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const key = (await params).key.join("/");
  if (!(await isPublishedMediaKey(key))) {
    return new NextResponse(null, { status: 404 });
  }
  try {
    const contents = await getMediaStorage().get(key);
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
