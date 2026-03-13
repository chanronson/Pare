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

/** Registers the `test` tool on the given MCP server. */
export function registerDbtTestTool(server: McpServer) {
  server.registerTool(
    "test",
    {
      title: "Dbt Test",
      description:
        "Runs dbt tests and returns structured diagnostics including pass/fail counts and error details.",
      annotations: { readOnlyHint: true },
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
        compact: compactInput,
      },
      outputSchema: DbtResultSchema,
    },
    async ({ path, select, exclude, target, compact }) => {
      const cwd = path || process.cwd();
      if (select) assertNoFlagInjection(select, "select");
      if (exclude) assertNoFlagInjection(exclude, "exclude");
      if (target) assertNoFlagInjection(target, "target");

      const args = ["test", "--log-format", "json"];
      if (select) args.push("--select", select);
      if (exclude) args.push("--exclude", exclude);
      if (target) args.push("--target", target);

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
