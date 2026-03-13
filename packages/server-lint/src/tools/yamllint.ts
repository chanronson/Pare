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
import { yamllintCmd } from "../lib/lint-runner.js";
import { parseYamllintParsable } from "../lib/parsers.js";
import { formatYamllint, compactYamllintMap, formatYamllintCompact } from "../lib/formatters.js";
import { YamllintResultSchema } from "../schemas/index.js";

/** Registers the `yamllint` tool on the given MCP server. */
export function registerYamllintTool(server: McpServer) {
  server.registerTool(
    "yamllint",
    {
      title: "Yamllint Format Checker",
      description: "Runs yamllint and returns structured formatting/linting diagnostics for YAML.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        path: projectPathInput,
        targets: z
          .array(z.string().max(INPUT_LIMITS.PATH_MAX))
          .max(INPUT_LIMITS.ARRAY_MAX)
          .optional()
          .default(["."])
          .describe("Files or directories to check (default: ['.'])"),
        config: configInput("Path to custom yamllint config file or config dict directly"),
        strict: z
          .boolean()
          .optional()
          .describe("Return non-zero exit code on warnings as well as errors"),
        compact: compactInput,
      },
      outputSchema: YamllintResultSchema,
    },
    async ({ path, targets, config, strict, compact }) => {
      const cwd = path || process.cwd();
      for (const t of targets ?? []) assertNoFlagInjection(t, "targets");
      if (config) assertNoFlagInjection(config, "config");

      const args = ["-f", "parsable"];
      if (config) args.push("-c", config);
      if (strict) args.push("--strict");
      args.push(...(targets || ["."]));

      const result = await yamllintCmd(args, cwd);

      const data = parseYamllintParsable(result.stdout);
      return compactDualOutput(
        data,
        result.stdout,
        formatYamllint,
        compactYamllintMap,
        formatYamllintCompact,
        compact === false,
      );
    },
  );
}
