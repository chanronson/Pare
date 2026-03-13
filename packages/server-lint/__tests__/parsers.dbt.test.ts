import { describe, it, expect } from "vitest";
import { parseSqlfluffJson, parseYamllintParsable } from "../src/lib/parsers.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES_DIR = join(__dirname, "../../../tests/smoke/fixtures/lint");

describe("parseSqlfluffJson", () => {
  it("parses valid JSON with violations", () => {
    const raw = readFileSync(join(FIXTURES_DIR, "sqlfluff/basic.txt"), "utf-8");
    const result = parseSqlfluffJson(raw);
    expect(result.filesChecked).toBe(1);
    expect(result.errors).toBe(6);
    expect(result.warnings).toBe(0);
    expect(result.diagnostics).toHaveLength(6);
    if (result.diagnostics) {
      expect(result.diagnostics[0]).toMatchObject({
        file: "bad.sql",
        line: 2,
        column: 1,
        severity: "error",
        rule: "LT09",
        name: "layout.select_targets",
      });
    }
  });

  it("handles invalid JSON gracefully", () => {
    const result = parseSqlfluffJson("Invalid JSON");
    expect(result.filesChecked).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });
});

describe("parseYamllintParsable", () => {
  it("parses parsable output correctly", () => {
    const raw = readFileSync(join(FIXTURES_DIR, "yamllint/basic.txt"), "utf-8");
    const result = parseYamllintParsable(raw);
    expect(result.filesChecked).toBe(1);
    expect(result.errors).toBe(2);
    expect(result.diagnostics).toHaveLength(2);
    if (result.diagnostics) {
      expect(result.diagnostics[0]).toMatchObject({
        file: "bad.yml",
        line: 3,
        column: 7,
        severity: "error",
        rule: "colons",
      });
    }
  });

  it("handles empty or invalid output gracefully", () => {
    const result = parseYamllintParsable("Nothing much here\nJust checking");
    expect(result.filesChecked).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });
});
