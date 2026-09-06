import type { VsCodeApi } from "./vscode";

let cached: VsCodeApi | undefined;

export function getVsCodeApi(): VsCodeApi {
  cached ??= acquireVsCodeApi();
  return cached;
}
