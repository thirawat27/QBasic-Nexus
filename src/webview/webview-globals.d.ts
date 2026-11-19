// Type declarations for globals available inside the CRT and ASCII chart
// webviews. Used by `npm run typecheck` only; not loaded at runtime.

/** Provided by VS Code inside every webview. */
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

interface Window {
  /** Safari / older WebKit name for AudioContext. */
  webkitAudioContext?: typeof AudioContext;
  /** Runtime bridge exposed by runtime.js for transpiled programs. */
  runtime?: Record<string, unknown>;
}

interface File {
  /** Absolute path, set by Electron for files dropped into a webview. */
  readonly path?: string;
}
