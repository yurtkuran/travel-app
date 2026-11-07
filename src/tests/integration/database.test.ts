import { afterAll, describe, expect, it } from "vitest";

import { getSqlClient } from "@/db/client";

describe("database", () => {
  afterAll(async () => {
    await getSqlClient().end();
  });

  it("accepts a query", async () => {
    const rows = await getSqlClient()`select 1 as value`;
    expect(rows[0]?.value).toBe(1);
  });
});
