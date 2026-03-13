import { describe, it, expect } from "vitest";
import { parseDbtJson } from "../src/lib/parsers.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES_DIR = join(__dirname, "../../../tests/smoke/fixtures/dbt");

describe("parseDbtJson", () => {
  it("parses success compile output correctly", () => {
    const raw = readFileSync(join(FIXTURES_DIR, "compile.json"), "utf8");
    const result = parseDbtJson(raw);

    expect(result.errors).toBe(0);
    expect(result.warnings).toBeGreaterThanOrEqual(0);
    expect(result.successes).toBeGreaterThanOrEqual(0);
  });

  it("parses success run output correctly", () => {
    const raw = readFileSync(join(FIXTURES_DIR, "run.json"), "utf8");
    const result = parseDbtJson(raw);

    expect(result.errors).toBe(0);
    expect(result.warnings).toBeGreaterThanOrEqual(0);
    expect(result.successes).toBeGreaterThan(0);
  });

  it("parses error run output correctly", () => {
    const raw = readFileSync(join(FIXTURES_DIR, "run_error.json"), "utf8");
    const result = parseDbtJson(raw);

    expect(result.errors).toBeGreaterThan(0);
    expect(result.diagnostics?.some((d) => d.severity === "error")).toBe(true);
  });

  it("parses success test output correctly", () => {
    const raw = readFileSync(join(FIXTURES_DIR, "test.json"), "utf8");
    const result = parseDbtJson(raw);

    expect(result.errors).toBe(0);
    expect(result.successes).toBeGreaterThan(0);
  });
});
