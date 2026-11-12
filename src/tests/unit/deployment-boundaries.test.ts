import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectFile = (name: string) =>
  readFileSync(resolve(process.cwd(), name), "utf8");

describe("deployment network boundaries", () => {
  it("binds local database tooling only to loopback", () => {
    const compose = projectFile("compose.yaml");
    expect(compose).toContain('"127.0.0.1:5432:5432"');
    expect(compose).toContain('"127.0.0.1:8080:8080"');
    expect(compose).not.toMatch(/^\s+-\s+["']?5432:5432["']?\s*$/m);
    expect(compose).not.toMatch(/^\s+-\s+["']?8080:8080["']?\s*$/m);
  });

  it("exposes only the application port from container images", () => {
    const dockerfile = projectFile("Dockerfile");
    const exposedPorts = [...dockerfile.matchAll(/^EXPOSE\s+(\d+)$/gm)].map(
      ([, port]) => port,
    );
    expect(exposedPorts).toEqual(["3000", "3000"]);
    expect(dockerfile).not.toMatch(/EXPOSE\s+(5432|8080)\b/);
  });

  it("keeps media on an internal persistent volume", () => {
    const compose = projectFile("compose.yaml");
    expect(compose).toContain("media_data:/app/.local-data/media");
    expect(compose).not.toMatch(/^\s+media:\s*$/m);
  });
});
