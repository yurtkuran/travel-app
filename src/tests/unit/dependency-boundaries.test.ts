import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectFile = (name: string) =>
  readFileSync(resolve(process.cwd(), name), "utf8");

const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

describe("dependency supply-chain boundaries", () => {
  it("pins every direct package dependency to an exact version", () => {
    const manifest = JSON.parse(projectFile("package.json")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    for (const version of Object.values({
      ...manifest.dependencies,
      ...manifest.devDependencies,
    })) {
      expect(version).toMatch(exactVersion);
    }
    expect(projectFile(".npmrc")).toContain("save-exact=true");
  });

  it("pins runtime container tags to exact releases", () => {
    const dockerfile = projectFile("Dockerfile");
    const compose = projectFile("compose.yaml");
    const workflow = projectFile(".github/workflows/ci.yml");

    expect(dockerfile.match(/node:24\.22\.2-alpine3\.24/g)).toHaveLength(2);
    expect(compose).toContain("postgres:18.6-alpine3.24");
    expect(workflow.match(/postgres:18\.6-alpine3\.24/g)).toHaveLength(2);
  });

  it("monitors packages, images, and workflow actions every week", () => {
    const dependabot = projectFile(".github/dependabot.yml");

    for (const ecosystem of ["npm", "docker", "github-actions"]) {
      expect(dependabot).toContain(`package-ecosystem: ${ecosystem}`);
    }
    expect(dependabot.match(/interval: weekly/g)).toHaveLength(3);
  });
});
