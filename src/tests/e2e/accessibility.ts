import { expect, type Page } from "@playwright/test";
import axe from "axe-core";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

type AccessibilityViolation = {
  help: string;
  helpUrl: string;
  id: string;
  impact: string | null;
  nodes: Array<{
    failureSummary: string | undefined;
    html: string;
    target: string[];
  }>;
};

export async function expectNoAccessibilityViolations(page: Page) {
  await page.evaluate(axe.source);
  const violations = await page.evaluate(
    async (tags): Promise<AccessibilityViolation[]> => {
      const axeRuntime = (
        globalThis as typeof globalThis & {
          axe: {
            run: (
              context: Document,
              options: {
                runOnly: { type: "tag"; values: string[] };
              },
            ) => Promise<{ violations: AccessibilityViolation[] }>;
          };
        }
      ).axe;
      const results = await axeRuntime.run(document, {
        runOnly: { type: "tag", values: tags },
      });

      return results.violations.map(({ help, helpUrl, id, impact, nodes }) => ({
        help,
        helpUrl,
        id,
        impact,
        nodes: nodes.map(({ failureSummary, html, target }) => ({
          failureSummary,
          html,
          target,
        })),
      }));
    },
    wcagTags,
  );

  const report = violations
    .map(
      ({ help, helpUrl, id, impact, nodes }) =>
        `${id} (${impact ?? "unknown"}): ${help}\n${nodes
          .map(
            ({ failureSummary, html, target }) =>
              `  ${target.join(" ")}\n  ${html}${failureSummary ? `\n  ${failureSummary}` : ""}`,
          )
          .join("\n")}\n  ${helpUrl}`,
    )
    .join("\n\n");

  expect(violations, report || "No WCAG A/AA violations found").toEqual([]);
}
