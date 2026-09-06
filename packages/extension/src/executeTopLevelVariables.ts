import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import * as esbuild from "esbuild";
import { TRACK_MERGE_CALL_NAME, transformSpreadProvenance } from "./transformSpreadProvenance.js";

const RESULT_MARKER = "__FRAGMENT_MOCK_RESULT__";

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
  const { transformedSource, provenanceVariableNames } = transformSpreadProvenance(fileName, sourceText);

  const importLine = `import { trackMerge as ${TRACK_MERGE_CALL_NAME} } from ${JSON.stringify(trackMergeModulePath)};\n`;

  // Provenance variables hold a Map, which JSON.stringify serializes as `{}`
  // by default, so each one is spread into a plain [path, entry][] array
  // instead of being captured by shorthand like the plain variables.
  const captureFields = [
    ...variableNames,
    ...[...provenanceVariableNames.values()].map(
      (provenanceName) => `${JSON.stringify(provenanceName)}: [...${provenanceName}.entries()]`,
    ),
  ];
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
    for (const name of variableNames) {
      values[name] = rawResult[name];
    }

    const overridesByName: Record<string, VariableOverrides> = {};
    for (const [name, provenanceName] of provenanceVariableNames) {
      const entries = rawResult[provenanceName] as [string, ProvenanceEntry][];
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
