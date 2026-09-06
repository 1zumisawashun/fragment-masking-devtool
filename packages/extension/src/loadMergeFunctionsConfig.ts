import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type MergeFunctionConfig = {
  name: string;
  argsAreSources: "all" | number[];
};

// The config file lives at the target project's root. We treat "project
// root" as the nearest ancestor directory containing a tsconfig.json —
// the same directory esbuild itself uses to auto-discover path aliases
// (see executeTopLevelVariables), so both stay consistent for a given file.
export function loadMergeFunctionsConfig(startDir: string): MergeFunctionConfig[] {
  const projectRoot = findProjectRoot(startDir);
  if (!projectRoot) return [];

  const configPath = join(projectRoot, ".fragmentmockrc.json");
  if (!existsSync(configPath)) return [];

  const parsed = JSON.parse(readFileSync(configPath, "utf-8")) as {
    mergeFunctions?: MergeFunctionConfig[];
  };
  return parsed.mergeFunctions ?? [];
}

function findProjectRoot(startDir: string): string | undefined {
  let dir = startDir;
  while (true) {
    if (existsSync(join(dir, "tsconfig.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}
