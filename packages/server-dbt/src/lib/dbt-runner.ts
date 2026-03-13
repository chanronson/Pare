import { run, type RunResult } from "@paretools/shared";

export async function dbtCmd(args: string[], cwd?: string): Promise<RunResult> {
  // `dbt` is run as a global shell command inside the venv
  return run("dbt", args, { cwd, timeout: 600_000 }); // 10 minutes wait time for dbt
}
