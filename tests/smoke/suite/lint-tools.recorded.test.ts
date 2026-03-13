/**
 * Smoke tests: lint tools (eslint, prettier format-check) — Phase 3 (recorded)
 *
 * Feeds REAL CLI output captured from actual projects through the tool
 * handlers. Validates that the parser, formatter, and schema chain works
 * with genuine CLI output.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
import {
  LintResultSchema,
  FormatCheckResultSchema,
  SqlfluffResultSchema,
  YamllintResultSchema,
} from "../../../packages/server-lint/src/schemas/index.js";

// Mock the lint runner module used by all lint tools
vi.mock("../../../packages/server-lint/src/lib/lint-runner.js", () => ({
  eslint: vi.fn(),
  prettier: vi.fn(),
  biome: vi.fn(),
  stylelintCmd: vi.fn(),
  oxlintCmd: vi.fn(),
  shellcheckCmd: vi.fn(),
  hadolintCmd: vi.fn(),
  sqlfluffCmd: vi.fn(),
  yamllintCmd: vi.fn(),
}));

vi.mock("../../../packages/server-lint/src/lib/parsers.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    resolveShellcheckPatterns: vi.fn(),
    validateShellcheckPatterns: vi.fn().mockReturnValue(null),
  };
});

import {
  eslint,
  prettier,
  sqlfluffCmd,
  yamllintCmd,
} from "../../../packages/server-lint/src/lib/lint-runner.js";
import { registerLintTool } from "../../../packages/server-lint/src/tools/lint.js";
import { registerFormatCheckTool } from "../../../packages/server-lint/src/tools/format-check.js";
import { registerSqlfluffTool } from "../../../packages/server-lint/src/tools/sqlfluff.js";
import { registerYamllintTool } from "../../../packages/server-lint/src/tools/yamllint.js";

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

function loadFixture(dir: string, name: string): string {
  return readFileSync(resolve(__dirname, "../fixtures/lint", dir, name), "utf-8");
}

// ═══════════════════════════════════════════════════════════════════════════
// eslint (lint tool) — recorded
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: lint.eslint", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(eslint).mockReset();
    vi.clearAllMocks();
    const server = new FakeServer();
    registerLintTool(server as never);
    handler = server.tools.get("lint")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = LintResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  function mockEslintWithFixture(name: string, stderr = "", exitCode = 0) {
    vi.mocked(eslint).mockResolvedValueOnce({
      stdout: loadFixture("eslint", name),
      stderr,
      exitCode,
    });
  }

  it("S1 [recorded] clean project", async () => {
    mockEslintWithFixture("s01-clean.txt", "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.errors).toBe(0);
    expect(parsed.warnings).toBe(0);
  });

  it("S2 [recorded] with errors and warnings", async () => {
    mockEslintWithFixture("s02-with-errors.txt", "", 1);
    const { parsed } = await callAndValidate({});
    expect(parsed.errors).toBeGreaterThanOrEqual(1);
    expect(parsed.diagnostics).toBeDefined();
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// prettier (format-check tool) — recorded
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: lint.format-check", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(prettier).mockReset();
    vi.clearAllMocks();
    const server = new FakeServer();
    registerFormatCheckTool(server as never);
    handler = server.tools.get("format-check")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    expect(result).toHaveProperty("content");
    const parsed = FormatCheckResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  function mockPrettierWithFixture(name: string, stderr = "", exitCode = 0) {
    vi.mocked(prettier).mockResolvedValueOnce({
      stdout: loadFixture("prettier", name),
      stderr,
      exitCode,
    });
  }

  it("S1 [recorded] all formatted", async () => {
    mockPrettierWithFixture("s01-clean.txt", "", 0);
    const { parsed } = await callAndValidate({});
    expect(parsed.formatted).toBe(true);
  });

  it("S2 [recorded] unformatted files", async () => {
    mockPrettierWithFixture("s02-dirty.txt", "", 1);
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.formatted).toBe(false);
    expect(parsed.files).toBeDefined();
    expect(parsed.files!.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// sqlfluff — recorded
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: lint.sqlfluff", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(sqlfluffCmd).mockReset();
    vi.clearAllMocks();
    const server = new FakeServer();
    registerSqlfluffTool(server as never);
    handler = server.tools.get("sqlfluff")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    const parsed = SqlfluffResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  function mockSqlfluffWithFixture(name: string, stderr = "", exitCode = 0) {
    vi.mocked(sqlfluffCmd).mockResolvedValueOnce({
      stdout: loadFixture("sqlfluff", name),
      stderr,
      exitCode,
    });
  }

  it("S1 [recorded] with violations", async () => {
    mockSqlfluffWithFixture("basic.json", "", 1);
    const { parsed } = await callAndValidate({ dialect: "ansi", compact: false });
    expect(parsed.errors).toBeGreaterThan(0);
    expect(parsed.diagnostics).toBeDefined();
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// yamllint — recorded
// ═══════════════════════════════════════════════════════════════════════════
describe("Recorded: lint.yamllint", () => {
  let handler: ToolHandler;

  beforeEach(() => {
    vi.mocked(yamllintCmd).mockReset();
    vi.clearAllMocks();
    const server = new FakeServer();
    registerYamllintTool(server as never);
    handler = server.tools.get("yamllint")!.handler;
  });

  async function callAndValidate(params: Record<string, unknown>) {
    const result = await handler(params);
    expect(result).toHaveProperty("structuredContent");
    const parsed = YamllintResultSchema.parse(result.structuredContent);
    return { result, parsed };
  }

  function mockYamllintWithFixture(name: string, stderr = "", exitCode = 0) {
    vi.mocked(yamllintCmd).mockResolvedValueOnce({
      stdout: loadFixture("yamllint", name),
      stderr,
      exitCode,
    });
  }

  it("S1 [recorded] with violations", async () => {
    mockYamllintWithFixture("basic.txt", "", 1);
    const { parsed } = await callAndValidate({ compact: false });
    expect(parsed.errors + parsed.warnings).toBeGreaterThan(0);
    expect(parsed.diagnostics).toBeDefined();
    expect(parsed.diagnostics!.length).toBeGreaterThan(0);
  });
});
