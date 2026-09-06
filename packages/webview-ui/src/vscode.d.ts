export type VsCodeApi = {
  postMessage: (message: unknown) => void;
};

declare global {
  function acquireVsCodeApi(): VsCodeApi;
}
