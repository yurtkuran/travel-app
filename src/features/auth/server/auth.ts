import "server-only";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

import { getDatabase } from "@/db/client";
import * as schema from "@/db/schema";
import { getServerEnv } from "@/lib/env";

export function createAuth({
  productionSecurity,
}: { productionSecurity?: boolean } = {}) {
  const env = getServerEnv();
  const secureProduction = productionSecurity ?? env.NODE_ENV === "production";

  return betterAuth({
    appName: "TravelTrove",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema,
      transaction: true,
      usePlural: true,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 15,
    },
    trustedOrigins: [env.BETTER_AUTH_URL],
    rateLimit: {
      enabled: secureProduction,
      window: 60,
      max: 100,
      storage: "memory",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
      },
    },
    advanced: {
      cookiePrefix: "traveltrove",
      disableCSRFCheck: false,
      disableOriginCheck: false,
      useSecureCookies: secureProduction,
      database: {
        validateSchema: true,
      },
    },
    plugins: [
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
      }),
      nextCookies(),
    ],
  });
}

export type TravelTroveAuth = ReturnType<typeof createAuth>;

let authInstance: TravelTroveAuth | undefined;

export function getAuth(): TravelTroveAuth {
  authInstance ??= createAuth();
  return authInstance;
}
