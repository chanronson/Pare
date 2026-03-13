#!/usr/bin/env node

import { createServer, readPackageVersion } from "@paretools/shared";
import { registerAllTools } from "./tools/index.js";

await createServer({
  name: "@paretools/dbt",
  version: readPackageVersion(import.meta.url),
  instructions:
    "Structured dbt operations (run, test, compile). Returns typed JSON with structured diagnostics and counts.",
  registerTools: registerAllTools,
});
