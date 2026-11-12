import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectFile = (name: string) =>
  readFileSync(resolve(process.cwd(), name), "utf8");

const sensitivePatterns = [
  ".env*",
  "*.key",
  "*.kdbx",
  "*.p12",
  "*.pem",
  "*.pfx",
  ".aws",
  ".ssh",
];

describe("secret scanning boundaries", () => {
  it("excludes local secrets and private-key formats from image builds", () => {
    const dockerignore = projectFile(".dockerignore");
    for (const pattern of sensitivePatterns) {
      expect(dockerignore).toContain(pattern);
    }
  });

  it("ignores local secrets and private-key formats in source control", () => {
    const gitignore = projectFile(".gitignore");
    for (const pattern of sensitivePatterns) {
      expect(gitignore).toContain(pattern);
    }
  });

  it("scans both committed files and the production image", () => {
    const workflow = projectFile(".github/workflows/security.yml");
    expect(workflow).toContain("scan-type: fs");
    expect(workflow).toContain("scan-type: image");
    expect(workflow.match(/scanners: secret/g)).toHaveLength(2);
    expect(workflow.match(/exit-code: "1"/g)).toHaveLength(2);
  });
});
