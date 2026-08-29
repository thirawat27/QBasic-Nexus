# QBasic Rust-to-WASM Internal Compiler

## Purpose

Replace the internal JavaScript transpiler plus `@yao-pkg/pkg` executable-packaging path with a production Browser/WebView compiler. It compiles QBasic source into distributable WebAssembly modules and runs them through a versioned browser runtime ABI.

## Status

- Current State: QBasic Nexus internally transpiles QBasic to JavaScript and packages executables with `@yao-pkg/pkg`.
- Implementation: planned.
- Target: Browser/WebView, including the QBasic Nexus CRT WebView and external web applications.
- Non-target: native executables, WASI/server hosts, and a bundled Node.js runtime in user output.

## Product Requirements

- Emit a standard `program.wasm` artifact usable outside VS Code.
- Support core QBasic, graphics, and compatibility with the current internal compiler for production use.
- Preserve structured diagnostics in the extension.
- Keep the compiler core in Rust and compile it both to host-native code for development/CI and WebAssembly for the extension host.
- Avoid `@yao-pkg/pkg` in the new internal-build path.

## Architecture

```text
QBasic source
  -> extension facade
  -> qbnex-compiler.wasm (Rust)
  -> program.wasm + optional manifest/source map
  -> qbnex-browser-runtime (JavaScript host)
  -> Browser/WebView APIs
```

The output module imports its host functions from the versioned `qbnex:v1` ABI namespace. The browser runtime implements this ABI once for both the CRT WebView and external browser consumers. It is host glue for browser APIs, not an executable packager or a Node.js runtime.

## Components

| Component | Responsibility | Dependencies |
| --- | --- | --- |
| `qbnex-core` | Shared spans, diagnostics, AST, typed IR, feature flags | Rust standard library only |
| `qbnex-frontend` | Lexer, parser, symbols, typing, compatibility rules | `qbnex-core` |
| `qbnex-codegen-wasm` | Typed IR to validated WebAssembly and custom metadata | `qbnex-core`, WASM encoder/validator |
| `qbnex-runtime-contract` | `qbnex:v1` import types, capability declarations, ABI versioning | `qbnex-core` |
| `qbnex-compiler-api` | WASM-facing `compile(source, options)` facade | Compiler crates, WASM bindings |
| `qbnex-browser-runtime` | Implements imports with DOM, Canvas, WebAudio, input, timers, storage | Browser APIs |
| Extension adapter | Invokes compiler facade; writes artifacts; maps diagnostics to VS Code | Existing extension commands/output UI |

## Compiler Model

1. Parse QBasic into an AST with source spans.
2. Resolve names, types, labels, procedure boundaries, arrays, and legacy compatibility behavior into typed IR.
3. Lower procedure control flow into basic blocks. Procedures using `GOTO`, `GOSUB`, `ON ERROR`, or `RESUME` use an explicit program-counter dispatcher so behavior is deterministic and does not depend on the WebAssembly call stack.
4. Emit standard WASM functions, linear-memory layouts for values/strings/arrays, and imports for browser-facing effects.
5. Validate the module. Only then return its bytes, metadata, and optional source-map data.

The compiler is not an interpreter. User QBasic is compiled into a separate `program.wasm` module.

## Runtime Contract

`qbnex:v1` is capability based. Initial capability groups are:

- `console`: `PRINT`, text cursor, `INPUT` request/result.
- `graphics`: Canvas-backed `SCREEN`, pixels, primitives, palette, text.
- `input`: keyboard, pointer, game-loop polling where supported.
- `audio`: basic QBasic sound/music behavior through WebAudio.
- `clock`: timer and yield/scheduling hooks.
- `storage`: browser-sandboxed file/data operations allowed by the host.
- `runtime`: allocation support, errors, string/array helpers, and host callbacks.

The manifest records ABI version and required capability groups. Before instantiation, a runtime rejects unsupported ABI versions or denied capabilities with a precise diagnostic. ABI additions are backward compatible within v1; breaking changes require `qbnex:v2`.

## Artifact Format

- Required: `<name>.wasm`.
- Optional: `<name>.qbnex.json` with compiler version, ABI version, capabilities, build options, and source-map reference.
- Optional: `<name>.wasm.map` for source locations at runtime.

Artifact files contain no Node.js executable wrapper. Consumers load `qbnex-browser-runtime` and instantiate the module using the manifest or explicit options.

## Extension Integration

The extension retains its compiler command, progress UI, output channel, worker resilience, and diagnostic presentation. The new adapter replaces the `runInternalTranspiler` packaging stage with:

1. Compile through `qbnex-compiler.wasm`.
2. Translate compiler diagnostics into VS Code diagnostics/output text.
3. Write the WASM artifact and optional metadata next to the source or to the configured output directory.
4. For **Compile & Run**, launch the CRT WebView with `qbnex-browser-runtime` rather than a packaged executable.

The old JS implementation remains temporarily as a comparison oracle behind an explicit development-only switch, then is removed once compatibility gates pass. `@yao-pkg/pkg` is removed from runtime dependencies when no supported path needs it.

## Error Handling

- Diagnostics have stable `code`, severity, message, span, and optional suggestion.
- Parse/type errors prevent artifact emission.
- Compiler faults return `QBNEX-INT-*` diagnostics and never terminate the extension host.
- Code generation validates WASM before file output.
- Browser runtime errors (bounds, divide-by-zero, invalid memory use, denied capability, ABI mismatch) map to QBasic-friendly messages and source locations when a source map is available.

## Production Quality Gates

1. Rust unit tests for lexing, parsing, semantics, lowering, and code generation.
2. Golden tests for source input, diagnostics, and expected WASM structure.
3. A feature matrix derived from the current internal compiler’s supported syntax/runtime surface. Every declared production feature has executable compatibility tests.
4. Browser integration tests in Chromium and the VS Code WebView harness for text output, Canvas pixels, input, audio mocks, storage behavior, and trap reporting.
5. Differential tests against the legacy internal engine for overlapping deterministic programs until the legacy engine is retired.
6. Benchmarks for compile latency, output size, startup time, and runtime speed. Thresholds are set from an initial baseline before release.

## Delivery Milestones

1. **Foundation**: Rust workspace, compiler API, diagnostic model, WASM artifact validator, and browser runtime skeleton.
2. **Core language**: variables, expressions, arrays, procedures, control flow, labels, console I/O, and runtime memory/string model.
3. **Graphics and interaction**: Canvas `SCREEN` path, drawing primitives, keyboard/input, timers, and audio.
4. **Compatibility closure**: feature matrix, legacy semantics, source maps, differential tests, and unsupported-feature diagnostics.
5. **Extension cutover**: artifact output, CRT execution, documentation migration, dependency removal, and release validation.

Milestones are implementation sequencing, not reduced product scope: production release requires core, graphics, and the agreed compatibility matrix.

## Decisions

- Browser/WebView is the only v1 target.
- Rust compiler core is reusable and compiles to both native and WASM forms.
- Program output and compiler implementation are different WASM modules.
- Browser behavior is supplied through a public, capability-based ABI.
- The `.wasm` artifact is the primary distributable; metadata/source maps are optional companions.

## Related Files

- `src/extension/internalTranspiler.js` — current JavaScript-to-pkg pipeline to replace.
- `src/compiler/compiler.js` — current compiler wrapper and diagnostic model.
- `src/managers/CompileWorkerClient.js` — existing worker/resilience integration.
- `src/webview/runner.html` — current WebView execution surface.
- `test/test-transpiler.js` — initial behavior/compatibility corpus.

## Not Done

- [ ] Rust workspace and ABI packages.
- [ ] WASM compiler facade and extension adapter.
- [ ] Browser runtime and CRT migration.
- [ ] Feature matrix and compatibility test corpus.
- [ ] Removal of the JS transpiler and `@yao-pkg/pkg` dependency.
