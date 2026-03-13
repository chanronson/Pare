import type { DbtResult, DbtDiagnostic } from "../schemas/index.js";

/**
 * Parses dbt JSON output (from `dbt run --log-format json`).
 *
 * dbt JSON format (one JSON object per line):
 * {"level": "info", "msg": "...", "data": { "node_info": { "node_path": "...", "unique_id": "..." } } }
 */
export function parseDbtJson(stdout: string): DbtResult {
  const diagnostics: DbtDiagnostic[] = [];
  const lines = stdout.split("\n").filter(Boolean);

  let successes = 0;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const level = (entry.info?.level || entry.level || "info").toLowerCase();
      let severity: "error" | "warning" | "info" | "debug" = "info";
      if (level === "error") severity = "error";
      else if (level === "warn" || level === "warning") severity = "warning";
      else if (level === "debug") severity = "debug";

      const message = entry.info?.msg || entry.msg || "";
      const nodeId = entry.data?.node_info?.unique_id;
      const file = entry.data?.node_info?.node_path;
      const threadName = entry.info?.thread;

      if (message.includes("PASS") || message.includes("OK")) {
        successes++;
      }

      if (severity === "error" || severity === "warning" || (severity === "info" && nodeId)) {
        diagnostics.push({
          file,
          severity,
          message,
          nodeId,
          threadName,
        });
      }
    } catch {
      // Ignore lines that aren't valid JSON (sometimes dbt outputs plain text warnings)
      continue;
    }
  }

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return {
    diagnostics,
    errors,
    warnings,
    successes,
  };
}
