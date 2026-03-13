import type { DbtResult, DbtResultCompact } from "../schemas/index.js";

/** Formats structured Dbt results into a human-readable diagnostic summary. */
export function formatDbt(data: DbtResult): string {
  const total = data.errors + data.warnings;
  if (total === 0) return `Dbt: success (ok: ${data.successes || 0}).`;

  const lines = [`Dbt: ${data.errors} errors, ${data.warnings} warnings`];
  for (const d of data.diagnostics ?? []) {
    const loc = d.file ? `${d.file}` : `node: ${d.nodeId}`;
    lines.push(`  ${loc} ${d.severity}: ${d.message}`);
  }
  return lines.join("\n");
}

export function compactDbtMap(data: DbtResult): DbtResultCompact {
  return {
    errors: data.errors,
    warnings: data.warnings,
    successes: data.successes,
  };
}

export function formatDbtCompact(data: DbtResultCompact): string {
  const total = data.errors + data.warnings;
  if (total === 0) return `Dbt: success (ok: ${data.successes || 0}).`;
  return `Dbt: ${data.errors} errors, ${data.warnings} warnings.`;
}
