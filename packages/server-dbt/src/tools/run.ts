import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
} from "@paretools/shared";
import { dbtCmd } from "../lib/dbt-runner.js";
import { parseDbtJson } from "../lib/parsers.js";
import { formatDbt, compactDbtMap, formatDbtCompact } from "../lib/formatters.js";
import { DbtResultSchema } from "../schemas/index.js";

/** Registers the `run` tool on the given MCP server. */
export function registerDbtRunTool(server: McpServer) {
  server.registerTool(
    "run",
    {
      title: "Dbt Run",
      description:
        "Runs dbt models and returns structured diagnostics including errors, warnings, and success counts.",
      annotations: { readOnlyHint: false },
      inputSchema: {
        path: projectPathInput,
        select: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("dbt node selection syntax (e.g. 'my_model+', 'tag:nightly')"),
        exclude: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("dbt node exclusion syntax"),
        target: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe("Which target to load for the given profile (e.g. dev, prod)"),
        fullRefresh: z.boolean().optional().describe("If set, run a --full-refresh"),
        compact: compactInput,
      },
      outputSchema: DbtResultSchema,
    },
    async ({ path, select, exclude, target, fullRefresh, compact }) => {
      const cwd = path || process.cwd();
      if (select) assertNoFlagInjection(select, "select");
      if (exclude) assertNoFlagInjection(exclude, "exclude");
      if (target) assertNoFlagInjection(target, "target");

      const args = ["run", "--log-format", "json"];
      if (select) args.push("--select", select);
      if (exclude) args.push("--exclude", exclude);
      if (target) args.push("--target", target);
      if (fullRefresh) args.push("--full-refresh");

      const result = await dbtCmd(args, cwd);
      const data = parseDbtJson(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatDbt,
        compactDbtMap,
        formatDbtCompact,
        compact === false,
      );
    },
  );
}
