import { z } from "zod";

/** Zod schema for a single Dbt diagnostic (from log format JSON). */
export const DbtDiagnosticSchema = z.object({
  file: z.string().optional(),
  line: z.number().optional(),
  column: z.number().optional(),
  severity: z.enum(["error", "warning", "info", "debug"]),
  message: z.string(),
  nodeId: z.string().optional(),
  threadName: z.string().optional(),
});

/** Zod schema for structured Dbt output. */
export const DbtResultSchema = z.object({
  diagnostics: z.array(DbtDiagnosticSchema).optional(),
  errors: z.number(),
  warnings: z.number(),
  successes: z.number().optional(),
});

export type DbtResult = z.infer<typeof DbtResultSchema>;
export type DbtDiagnostic = z.infer<typeof DbtDiagnosticSchema>;

export type DbtResultCompact = {
  errors: number;
  warnings: number;
  successes?: number;
};
