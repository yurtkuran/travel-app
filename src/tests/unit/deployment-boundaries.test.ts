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

  it("publishes only the production reverse proxy", () => {
    const compose = projectFile("compose.production.yaml");
    expect(compose).toContain('"80:80"');
    expect(compose).toContain('"443:443"');
    expect(compose).not.toMatch(/5432:5432/);
    expect(compose).not.toMatch(/8080:8080/);
    expect(compose).toContain("database:\n    internal: true");
    expect(compose).toContain("target: production");
    expect(compose).toContain("target: migration");
  });

  it("requires persistent paths, health checks, and bounded logs", () => {
    const compose = projectFile("compose.production.yaml");
    expect(compose).toContain("TRAVELTROVE_DATA_ROOT:?");
    expect(compose.match(/healthcheck:/g)).toHaveLength(3);
    expect(compose).toContain("max-size: 10m");
    expect(compose).toContain('max-file: "5"');
    expect(compose.match(/restart: unless-stopped/g)).toHaveLength(3);
  });

  it("tags application and migration images with one immutable revision", () => {
    const compose = projectFile("compose.production.yaml");
    const dockerfile = projectFile("Dockerfile");
    expect(compose).toContain(
      "traveltrove-app:${TRAVELTROVE_RELEASE:?set TRAVELTROVE_RELEASE}",
    );
    expect(compose).toContain(
      "traveltrove-migrate:${TRAVELTROVE_RELEASE:?set TRAVELTROVE_RELEASE}",
    );
    expect(compose.match(/APP_REVISION:/g)).toHaveLength(2);
    expect(
      dockerfile.match(/LABEL org\.opencontainers\.image\.revision/g),
    ).toHaveLength(2);
  });

  it("does not log credential-bearing proxy request URLs", () => {
    const caddyfile = projectFile("deploy/Caddyfile");
    expect(caddyfile).not.toMatch(/^\s*log\s*{/m);
  });

  it("sends coordinated backups through a constrained encrypted transfer", () => {
    const compose = projectFile("compose.production.yaml");
    const backup = projectFile("deploy/backup.sh");
    const timer = projectFile("deploy/systemd/traveltrove-backup.timer");

    expect(compose).toContain("rclone/rclone:1.76.0");
    expect(compose).toContain("/backup:ro");
    expect(compose).toContain("rclone.conf:ro");
    expect(backup).toContain("stop --timeout 60 app");
    expect(backup).toContain("sha256sum");
    expect(backup).toContain('check "/backup/$timestamp"');
    expect(timer).toContain("OnCalendar=*-*-* 03:15:00 UTC");
    expect(timer).toContain("Persistent=true");
  });

  it("verifies off-host recovery points without modifying live data", () => {
    const compose = projectFile("compose.production.yaml");
    const verifier = projectFile("deploy/verify-backup.sh");
    const timer = projectFile(
      "deploy/systemd/traveltrove-restore-verification.timer",
    );

    expect(compose.match(/rclone\/rclone:1\.76\.0/g)).toHaveLength(2);
    expect(compose).toContain("restore-transfer:");
    expect(compose).toContain("/backup\n");
    expect(verifier).toContain("latest_recovery_point");
    expect(verifier).toContain("sha256sum --check SHA256SUMS");
    expect(verifier).toContain("pg_restore");
    expect(verifier).toContain("traveltrove_restore_verify_");
    expect(verifier).toContain("DROP DATABASE IF EXISTS");
    expect(verifier).not.toContain('--dbname="$POSTGRES_DB"');
    expect(timer).toContain("OnCalendar=*-*-01 05:15:00 UTC");
    expect(timer).toContain("Persistent=true");
  });

  it("fails production preflight before unsafe deployment work", () => {
    const preflight = projectFile("deploy/preflight.sh");
    const environment = projectFile(".env.production.example");

    expect(preflight).toContain("status --porcelain");
    expect(preflight).toContain("rev-parse HEAD");
    expect(preflight).toContain("docker info");
    expect(preflight).toContain("docker compose version");
    expect(preflight).toContain("getent ahosts");
    expect(preflight).toContain("config --quiet");
    expect(preflight).toContain("TRAVELTROVE_MIN_FREE_BYTES");
    expect(preflight).toContain(
      "must not be accessible by group or other users",
    );
    expect(preflight).not.toMatch(/echo[^\n]*\$\{?POSTGRES_PASSWORD/);
    expect(preflight).not.toMatch(/echo[^\n]*\$\{?BETTER_AUTH_SECRET/);
    expect(environment).toContain("TRAVELTROVE_MIN_FREE_BYTES=10737418240");
  });
});
