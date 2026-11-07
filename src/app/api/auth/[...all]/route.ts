import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/features/auth/server/auth";

export const runtime = "nodejs";

export const { DELETE, GET, PATCH, POST, PUT } = toNextJsHandler((request) =>
  getAuth().handler(request),
);
