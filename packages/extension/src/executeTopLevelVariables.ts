import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import * as esbuild from "esbuild";

const RESULT_MARKER = "__FRAGMENT_MOCK_RESULT__";

export function executeTopLevelVariables(
  fileName: string,
  sourceText: string,
  variableNames: string[],
): Record<string, unknown> {
  // Appending the capture statement after the original source (rather than
  // rewriting it) keeps every top-level const in scope, whether or not it's
  // exported, so we don't need per-variable export instrumentation.
  const instrumentedSource = `${sourceText}\nconsole.log(${JSON.stringify(RESULT_MARKER)} + JSON.stringify({ ${variableNames.join(", ")} }));\n`;

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
    return JSON.parse(markerLine.slice(RESULT_MARKER.length)) as Record<string, unknown>;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
