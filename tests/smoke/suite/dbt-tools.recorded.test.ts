/**
 * Smoke tests: dbt tools (run, test, compile) — Recorded Phase
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { DbtResultSchema } from "../../../packages/server-dbt/src/schemas/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Mock the dbt runner
vi.mock("../../../packages/server-dbt/src/lib/dbt-runner.js", () => ({
  dbtCmd: vi.fn(),
}));

import { dbtCmd } from "../../../packages/server-dbt/src/lib/dbt-runner.js";
import { registerDbtRunTool } from "../../../packages/server-dbt/src/tools/run.js";
import { registerDbtTestTool } from "../../../packages/server-dbt/src/tools/test.js";
import { registerDbtCompileTool } from "../../../packages/server-dbt/src/tools/compile.js";

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: unknown[];
  structuredContent: unknown;
}>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();
  registerTool(name: string, _config: Record<string, unknown>, handler: ToolHandler) {
    this.tools.set(name, { handler });
  }
}

function loadFixture(name: string): string {
  return readFileSync(resolve(__dirname, "../fixtures/dbt", name), "utf-8");
}

describe("Recorded: dbt tools", () => {
  let server: FakeServer;

  beforeEach(() => {
    vi.mocked(dbtCmd).mockReset();
    vi.clearAllMocks();
    server = new FakeServer();
  });

  describe("run", () => {
    it("S1 [recorded] success run", async () => {
      registerDbtRunTool(server as never);
      const handler = server.tools.get("run")!.handler;
      vi.mocked(dbtCmd).mockResolvedValueOnce({
        stdout: loadFixture("run.json"),
        stderr: "",
        exitCode: 0,
      });

      const result = await handler({});
      const parsed = DbtResultSchema.parse(result.structuredContent);
      expect(parsed.errors).toBe(0);
      expect(parsed.successes).toBeGreaterThan(0);
    });

    it("S2 [recorded] error run", async () => {
      registerDbtRunTool(server as never);
      const handler = server.tools.get("run")!.handler;
      vi.mocked(dbtCmd).mockResolvedValueOnce({
        stdout: loadFixture("run_error.json"),
        stderr: "Runtime Error",
        exitCode: 1,
      });

      const result = await handler({});
      const parsed = DbtResultSchema.parse(result.structuredContent);
      expect(parsed.errors).toBeGreaterThan(0);
    });
  });

  describe("test", () => {
    it("S1 [recorded] success test", async () => {
      registerDbtTestTool(server as never);
      const handler = server.tools.get("test")!.handler;
      vi.mocked(dbtCmd).mockResolvedValueOnce({
        stdout: loadFixture("test.json"),
        stderr: "",
        exitCode: 0,
      });

      const result = await handler({});
      const parsed = DbtResultSchema.parse(result.structuredContent);
      expect(parsed.errors).toBe(0);
      expect(parsed.successes).toBeGreaterThan(0);
    });
  });

  describe("compile", () => {
    it("S1 [recorded] success compile", async () => {
      registerDbtCompileTool(server as never);
      const handler = server.tools.get("compile")!.handler;
      vi.mocked(dbtCmd).mockResolvedValueOnce({
        stdout: loadFixture("compile.json"),
        stderr: "",
        exitCode: 0,
      });

      const result = await handler({});
      const parsed = DbtResultSchema.parse(result.structuredContent);
      expect(parsed.errors).toBe(0);
    });
  });
});
