import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  shouldRegisterTool,
  isCoreToolForServer,
  registerDiscoverTool,
  type LazyToolManager,
} from "@paretools/shared";
import { registerDbtRunTool } from "./run.js";
import { registerDbtTestTool } from "./test.js";
import { registerDbtCompileTool } from "./compile.js";

const TOOL_DEFS: Array<{
  name: string;
  description: string;
  register: (server: McpServer) => void;
}> = [
  {
    name: "run",
    description:
      "Runs dbt models and returns structured diagnostics including errors, warnings, and success counts.",
    register: registerDbtRunTool,
  },
  {
    name: "test",
    description:
      "Runs dbt tests and returns structured diagnostics including pass/fail counts and error details.",
    register: registerDbtTestTool,
  },
  {
    name: "compile",
    description:
      "Compiles dbt models (generates SQL without executing) and returns structured diagnostics.",
    register: registerDbtCompileTool,
  },
];

/** Registers all Dbt tools on the given MCP server, filtered by policy. */
export function registerAllTools(server: McpServer, lazyManager?: LazyToolManager) {
  const s = (name: string) => shouldRegisterTool("dbt", name);
  const isCore = (name: string) => isCoreToolForServer("dbt", name);

  for (const def of TOOL_DEFS) {
    if (!s(def.name)) continue;

    if (lazyManager && !isCore(def.name)) {
      lazyManager.registerLazy(def);
    } else {
      def.register(server);
    }
  }

  if (lazyManager && lazyManager.hasDeferredTools()) {
    registerDiscoverTool(server, lazyManager, "dbt");
  }
}
