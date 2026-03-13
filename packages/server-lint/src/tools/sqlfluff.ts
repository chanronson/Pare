import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  compactDualOutput,
  assertNoFlagInjection,
  INPUT_LIMITS,
  compactInput,
  projectPathInput,
  configInput,
} from "@paretools/shared";
import { sqlfluffCmd } from "../lib/lint-runner.js";
import { parseSqlfluffJson } from "../lib/parsers.js";
import { formatSqlfluff, compactSqlfluffMap, formatSqlfluffCompact } from "../lib/formatters.js";
import { SqlfluffResultSchema } from "../schemas/index.js";

/** Registers the `sqlfluff` tool on the given MCP server. */
export function registerSqlfluffTool(server: McpServer) {
  server.registerTool(
    "sqlfluff",
    {
      title: "Sqlfluff Lint",
      description: "Runs sqlfluff lint and returns structured lint diagnostics.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        path: projectPathInput,
        targets: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe("Files or directories to check (default: ['.'])"),
        dialect: z
          .string()
          .max(INPUT_LIMITS.SHORT_STRING_MAX)
          .optional()
          .describe(
            "SQL dialect (e.g. ansi, postgres, snowflake). Highly recommended if no config file configures it.",
          ),
        rules: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Specific rules to check (e.g. ['LT09', 'LT02'])"),
        excludeRules: z
          .array(z.string().max(INPUT_LIMITS.SHORT_STRING_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .describe("Specific rules to ignore"),
        config: configInput("Path to custom sqlfluff config file"),
        compact: compactInput,
      },
      outputSchema: SqlfluffResultSchema,
    },
    async ({ path, targets, dialect, rules, excludeRules, config, compact }) => {
      const cwd = path || process.cwd();
      for (const t of targets ?? []) assertNoFlagInjection(t, "targets");
      if (dialect) assertNoFlagInjection(dialect, "dialect");
      if (config) assertNoFlagInjection(config, "config");
      for (const r of rules ?? []) assertNoFlagInjection(r, "rules");
      for (const e of excludeRules ?? []) assertNoFlagInjection(e, "excludeRules");

      const args = ["lint", "--format", "json"];
      if (dialect) args.push("--dialect", dialect);
      if (rules && rules.length > 0) args.push("--rules", rules.join(","));
      if (excludeRules && excludeRules.length > 0)
        args.push("--exclude-rules", excludeRules.join(","));
      if (config) args.push("--config", config);
      args.push(...(targets || ["."]));

      const result = await sqlfluffCmd(args, cwd);

      const data = parseSqlfluffJson(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatSqlfluff,
        compactSqlfluffMap,
        formatSqlfluffCompact,
        compact === false,
      );
    },
  );
}
