import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import * as esbuild from "esbuild";
import { loadMergeFunctionsConfig } from "./loadMergeFunctionsConfig.js";
import {
  GET_PROVENANCE_CALL_NAME,
  TRACK_AND_ATTACH_CALL_NAME,
  transformProvenanceTracking,
} from "./transformProvenanceTracking.js";

const RESULT_MARKER = "__FRAGMENT_MOCK_RESULT__";
const PROVENANCE_ENTRIES_SUFFIX = "__provenanceEntries";

export type VariableOverrides = { path: string; overriddenBy: string[] }[];

export type ExecutionResult = {
  values: Record<string, unknown>;
  overridesByName: Record<string, VariableOverrides>;
};

type ProvenanceEntry = { value: unknown; path: string[]; sourceLabel: string; overriddenBy?: string[] };

export function executeTopLevelVariables(
  fileName: string,
  sourceText: string,
  variableNames: string[],
  trackMergeModulePath: string,
): ExecutionResult {
  const mergeFunctions = loadMergeFunctionsConfig(dirname(fileName));
  const { transformedSource } = transformProvenanceTracking(fileName, sourceText, mergeFunctions);

  const importLine = `import { trackAndAttach as ${TRACK_AND_ATTACH_CALL_NAME}, getProvenance as ${GET_PROVENANCE_CALL_NAME} } from ${JSON.stringify(trackMergeModulePath)};\n`;

  // Provenance is fetched uniformly for every top-level variable (rather
  // than only ones we know we transformed) since a value can also end up
  // carrying provenance indirectly — e.g. by simply aliasing a tracked one.
  // getProvenance returns undefined for anything untracked, and JSON.stringify
  // omits an object field whose value is undefined, so untracked variables
  // just don't get a "*__provenanceEntries" key at all.
  const captureFields = variableNames.flatMap((name) => [
    name,
    `${JSON.stringify(`${name}${PROVENANCE_ENTRIES_SUFFIX}`)}: (() => { const p = ${GET_PROVENANCE_CALL_NAME}(${name}); return p ? [...p.entries()] : undefined; })()`,
  ]);
  const captureLine = `console.log(${JSON.stringify(RESULT_MARKER)} + JSON.stringify({ ${captureFields.join(", ")} }));\n`;

  const instrumentedSource = `${importLine}${transformedSource}\n${captureLine}`;

  // stdin + resolveDir lets esbuild resolve relative imports, node_modules,
  // and the target project's tsconfig path aliases as if this were a real
  // file at `fileName`, without writing an instrumented copy next to it.
  const built = esbuild.buildSync({
    stdin: {
      contents: instrumentedSource,
      resolveDir: dirname(fileName),
      sourcefile: basename(fileName),
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    logLevel: "silent",
  });

  const tempDir = mkdtempSync(join(tmpdir(), "fragment-mock-"));
  const bundlePath = join(tempDir, "bundle.cjs");
  writeFileSync(bundlePath, built.outputFiles[0].text, "utf-8");

  try {
    const stdout = execFileSync("node", [bundlePath], { encoding: "utf-8" });
    const markerLine = stdout.split("\n").find((line) => line.startsWith(RESULT_MARKER));
    if (!markerLine) {
      throw new Error("実行結果を取得できませんでした");
    }

    const rawResult = JSON.parse(markerLine.slice(RESULT_MARKER.length)) as Record<string, unknown>;

    const values: Record<string, unknown> = {};
    const overridesByName: Record<string, VariableOverrides> = {};

    for (const name of variableNames) {
      values[name] = rawResult[name];

      const entries = rawResult[`${name}${PROVENANCE_ENTRIES_SUFFIX}`] as
        | [string, ProvenanceEntry][]
        | undefined;
      if (!entries) continue;

      const overrides = entries
        .filter(([, entry]) => (entry.overriddenBy?.length ?? 0) > 0)
        .map(([path, entry]) => ({ path, overriddenBy: entry.overriddenBy ?? [] }));
      if (overrides.length > 0) {
        overridesByName[name] = overrides;
      }
    }

    return { values, overridesByName };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
