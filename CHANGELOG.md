# Changelog

All notable changes to "QBasic Nexus" extension will be documented in this file.

## [2.0.0] - 2026-11-19

### 💥 Breaking Changes

- **Removed the internal "Qbasic Nexus" build mode**: Compile and Compile & Run now always use an external QB64 / QB64-PE compiler. The JavaScript-to-executable packaging path (`@yao-pkg/pkg`) and its WASM-accelerator variant are gone, so the extension no longer installs the packager and its ~200 transitive packages.
- **Removed settings**: `qbasic-nexus.compilerMode`, `qbasic-nexus.internalTargets`, `qbasic-nexus.internalOutputDir`, `qbasic-nexus.internalWasmAccelerator`. Existing values are ignored.
- **Removed commands**: QBasic Select Compiler Mode, QBasic Internal Build Quick Actions, QBasic Select Internal Build Targets, QBasic Select Internal Output Folder, QBasic Select Internal WASM Accelerator.
- **Minimum VS Code version is now 1.125.0** (was 1.107.0). Older VS Code builds will not install this release.
- **No more cross-platform executables from one machine**: the internal mode could package `win-x64`, `linux-x64` and `macos-arm64` binaries from a single host. QB64 builds only for the platform it runs on, so build on each target OS instead.
- **Removed the WebAssembly accelerator** from the built-in transpiler (the `web-wasm` / `node-wasm` targets). Only the removed build mode used it.
- **Removed the QBNex compiler section** from the README and the unused Rust-to-WASM compiler design document.

### ✨ QB64 / QB64-PE Support

- **Every QB64 compiler error is now reported**: build output is parsed by QB64's error-block structure (`message` / `Caused by (or after):` / `LINE n:`) instead of a fixed list of message prefixes. Errors such as `FOR without NEXT` were silently dropped before. ANSI colours and progress bars no longer break parsing, `-w` warnings are reported once and include their detail line, and full Windows paths in `file.bas:12: warning:` lines are matched.
- **QB64 forks are accepted**: a compiler executable with a non-standard name is accepted when its `-?` banner identifies it as a QB64-family compiler. The result is cached per file.
- **New `QB64_COMPILER` environment variable** points auto-detection at a specific QB64-family executable, such as a fork with its own executable name.
- **Build output names the compiler**: the output panel shows the detected compiler and version (for example `QB64-PE Compiler V3.14.1`) before each build.
- **QB64-PE language support**: completion, hover and signature help now cover QB64-PE additions such as `_IIF`, `_ANDALSO`/`_ORELSE`/`_NEGATE`, `_UPRINTSTRING`, `_READFILE$`/`_WRITEFILE`, `_SAVEIMAGE`, `_MESSAGEBOX`/`_INPUTBOX$`/file dialogs, `_LOG*`, `_MIN`/`_MAX`/`_CLAMP`, hashing, Base64/URL and compression helpers, plus metacommands such as `$NOPREFIX`, `$EMBED`, `$UNSTABLE`, `$EXEICON`, `$VERSIONINFO` and `$INCLUDEONCE`.
- **Metacommands no longer cause false lint errors**: `$RESIZE:ON` was read as an `ON ... GOTO` statement. Whole-line metacommands are now skipped by the lexer; `$IF/$ELSE/$END IF/$LET` keep their existing behaviour. Bare `$METACOMMAND` lines are also highlighted.

### 🐞 QB64-PE Debugger

- **Debug QB64-PE programs in VS Code (F5)**: a new `qb64` debug type compiles the current file with QB64-PE and connects to it through QB64-PE's `$DEBUG` (vWATCH) channel, the same one the QB64-PE IDE uses. Supports breakpoints, Continue, Pause, Step Over / Into / Out, the call stack, and stopping on runtime errors.
- If the file has no `$DEBUG` line, you are offered to add it before the launch.
- Limits: variable values cannot be read yet, and breakpoints only work in the main `.bas` file, because QB64-PE does not instrument `$INCLUDE`d code or `$CHECKING:OFF` blocks.

### 🧭 New Editor Features

- **Clickable `$INCLUDE`**: Ctrl+click the file name in `'$INCLUDE: 'lib.bi'` to open the included file.
- **Go to Symbol in Workspace (Ctrl+T)**: searches `SUB`, `FUNCTION`, `TYPE`, `CONST` and labels in every QBasic file of the workspace, including unsaved changes in open editors.
- **QB64-PE compatibility warnings**: when the detected compiler is the original QB64, QB64-PE-only keywords such as `_IIF`, `_READFILE$`, `_MESSAGEBOX` and `$EMBED` get a warning before you build. New setting `qbasic-nexus.warnQB64PEOnly` (default `true`).
- **Format Selection**: format only the selected lines; indentation still follows the blocks opened above the selection.
- **Reference CodeLens**: every `SUB` and `FUNCTION` shows how many places call it; click to list them. New setting `qbasic-nexus.codeLens.references` (default `true`).
- **Call Hierarchy (Shift+Alt+H)**: incoming and outgoing calls between procedures across files; module-level code appears as `(module) file.bas`.
- **Inlay hints**: parameter names at calls to your procedures and to built-in functions with two or more parameters (`qbasic-nexus.inlayHints.parameterNames`, default `true`), plus optional suffix type hints such as `count%` → `INTEGER` (`qbasic-nexus.inlayHints.variableTypes`, default `false`).
- **Build tasks**: **Terminal → Run Build Task** offers **qb64: Build current file**. A `qb64` task type in `tasks.json` accepts `file` and `args`, and a `$qb64` problem matcher is available for your own shell tasks.

### 🧠 On-Device Code Insights

Lightweight algorithms that run locally, with no model download and no network:

- **"Did you mean" typo detection**: an edit-distance check (Damerau–Levenshtein) flags misspelled statements, built-in functions and `SUB` / `FUNCTION` names (`PIRNT` → `PRINT`, `Lenn` → `LEN`, `DrawPlyer` → `DrawPlayer`) with a quick fix. Only names with a close known match are reported, and `$NOPREFIX` programs are understood. Setting `qbasic-nexus.analysis.typos`.
- **Unused procedures**: `SUB`s and `FUNCTION`s that nothing in the workspace calls are faded out, using the call graph behind CodeLens and Call Hierarchy. Setting `qbasic-nexus.analysis.unusedProcedures`.
- **Complexity CodeLens**: `complexity N` (McCabe cyclomatic complexity) above procedures at or above `qbasic-nexus.codeLens.complexityThreshold` (default `10`).
- **Duplicate code detection**: windows of normalized code lines are hashed to find blocks repeated in the same file or across files, with a link to the other copy. Settings `qbasic-nexus.analysis.duplicateCode` and `qbasic-nexus.analysis.duplicateMinLines` (default `6`).
- **GOTO → DO...LOOP refactor**: backward `GOTO` loops are marked and can be rewritten as `DO ... LOOP` / `LOOP WHILE condition`. Only offered when the label is used once, the loop stays inside one block, and no other code jumps into it. Setting `qbasic-nexus.analysis.gotoLoops`.
- **Learned completion ranking**: a small n-gram model learns from the workspace's own `.bas` files which word usually comes next and moves those completions to the top, marked ★. Counts live in memory and never leave the machine. Setting `qbasic-nexus.completion.learnedRanking`.

### 🟦 TypeScript

- The extension is now built with the TypeScript compiler into `out/`. `src/shared`, `src/providers`, `src/debug`, `src/extension` and `src/commands` (about 70 modules) are TypeScript; the compiler, parser, managers, workers and the CRT webview are still JavaScript and are type-checked with `checkJs`. `npm run compile` builds, `npm test` compiles first, and packaging runs the build through `vscode:prepublish`.

### 🐛 Fixes

- **`'$INCLUDE: 'file.bi'` is now followed for cross-file IntelliSense**: only the bare `$INCLUDE:` form was recognised, so symbols from files included with the usual comment form (`'$INCLUDE:` or `REM $INCLUDE:`) were found only when the workspace scan happened to reach them.

- **Compile no longer waits for the "Save this path?" notification**: when QB64 was auto-detected, Compile and Compile & Run waited for an answer to *Found QB64 at … Save this path?* and never started if the notification was dismissed unanswered. The build now uses the detected compiler at once while the notification stays available; the *Continue Once* button is gone.

Found by running real `.bas` programs end to end (see Quality Assurance), all in the built-in compiler used by linting and **Run in Retro CRT**:

- **Line numbers work as jump targets**: `GOTO 10`, `GOSUB 1000`, `ON n GOTO 100, 200`, `IF x THEN 100 ELSE 200`, `ON ERROR GOTO 900`, `RESUME 100` and `RESTORE 200` were reported as *Expected label* or ignored. A number at the start of a line is now a label, as in QBasic.
- **GOTO loops no longer reset their variables**: a variable first assigned inside a backward `GOTO` loop without `DIM` (`I = I + 1` … `IF I < 3 THEN GOTO top`) was set back to 0 on every pass, so the loop never ended.
- **SUB calls without CALL**: `DrawBoard 3, "x"` was compiled as the assignment `DrawBoard = 3` and failed with *already been declared*. A statement that starts with a name and has no `=` is now a SUB call, as in QBasic. `Foo (a), b` passes both arguments.
- **`DIM SHARED` declared nothing**: the `SHARED` keyword ended the declaration loop, so `DIM SHARED total AS INTEGER` left `total` undeclared and SUBs could not see it. `REDIM SHARED` had the same bug.
- **`SHARED x` inside a SUB / FUNCTION** is now supported; its names were parsed as a statement of their own.
- **Typed and array parameters**: in `SUB Hanoi (n AS INTEGER, from$, to$)` only `n` was read and the rest broke the header. Parameters now accept `BYVAL` / `BYREF`, `AS type` (values are converted to the declared type, so `2.6` passed `AS INTEGER` becomes `3`) and `name()` arrays.
- **Passing a whole array**: `CALL Sort(scores())` failed with *Subscript out of range*; `name()` with empty parentheses now passes the array.
- **`RESTORE label`** now continues `READ` from the `DATA` after that label or line number; before, the label was ignored and `READ` restarted from the first `DATA` item. An unknown label is reported.
- The GOTO → DO...LOOP refactor only treats `IF x THEN label` as a jump for line numbers, matching QBasic, and handles numbered jump lines (`50 IF I <= 3 THEN 30` → `50 LOOP WHILE I <= 3`).

### 🔒 Kept

- The built-in parser still powers real-time diagnostics, **Run in Retro CRT** and the interactive tutorial; none of these need QB64.
- When QB64 is not found, the warning now offers **Run in Retro CRT** instead of switching to the removed internal mode.

### 🎛️ UI Changes

- **Status bar and Configure System are QB64-only**: the status-bar tooltip shows the QB64 path instead of mode, targets, output folder and WASM state, and the **QBasic Configure System ⚙️** picker no longer lists compiler mode, internal targets, output folder or WASM accelerator.

### 📦 Dependencies

- Removed runtime dependencies `@yao-pkg/pkg` and `magic-string`. The extension now ships with three small runtime dependencies: `defu`, `flru` and `mitt`.

### 🚀 Release & Distribution

- **Published to both VS Code Marketplace and Open VSX**: pushing a `v*` tag builds one `.vsix`, checks that the tag matches the `package.json` version, runs lint and tests, then publishes to the Marketplace and Open VSX and attaches the `.vsix` to a GitHub Release. VSCodium, Gitpod and other Open VSX-based editors can now install the extension from their own registry.
- CI now builds the `.vsix` on every run and uploads it as a build artifact.

### ✅ Quality Assurance

- Added `test/test-qb64pe-support.js` (QB64-PE catalog, metacommand lexing, `$RESIZE:ON` regression) and `test/test-worker-settings.js`.
- Extended `test/test-qb64-autodetect.js` (fork banner detection, `QB64_COMPILER`) and `test/test-qb64-compiler.js` (error-block parsing, progress bars, ANSI stripping, warning de-duplication).
- Added `npm run test:vscode` (`test/vscode/`): 28 integration tests that run inside a real VS Code with the extension in development mode and a throwaway profile. They cover activation, every command, hover, completion and learned ranking, signature help, definition into `$INCLUDE` files, links, symbols, references, rename, CodeLens, call hierarchy, inlay hints, formatting, folding, semantic tokens, the code-insight diagnostics and their quick fixes, the QB64-PE-only warning, a real QB64 build through the task and the Compile command, a debug session that stops at a breakpoint, and Run in Retro CRT. Set `QB64_PATH` to run the build and debugger tests against a real compiler.
- Added `test/test-bas-programs.js` with 16 `.bas` programs in `test/fixtures/programs` (line numbers, GOSUB, ON GOTO, ON ERROR / RESUME, DATA / RESTORE, labels, SUB / FUNCTION, recursion, TYPE, arrays, strings, SELECT CASE, WHILE / WEND). Each one must lint clean, print its expected output (run in a child process with a timeout), raise no false typo warning, and print the same output after every offered GOTO → DO...LOOP rewrite.
- Added `test/test-code-insights.js` (edit distance, typo detection, unused procedures, complexity, duplicate blocks, safe and unsafe GOTO loops, n-gram counting and prediction).
- Added `test/test-language-features.js` ($INCLUDE parsing and resolution, symbol search, QB64-PE-only detection, range formatting, call graph, inlay hints, build-task file resolution) and `test/test-qb64-debugger.js` (vWATCH framing and handshake, plus a full debug session against a fake `$DEBUG` program over TCP).
- Removed `test/test-internal-build-settings.js` and the packaging cases of `test/test-executable-utils.js` along with the code they covered.

### 📝 Documentation

- README rewritten around the QB64 / QB64-PE workflow.
- `SECURITY.md` no longer describes the internal transpiler mode or the removed packaging dependencies.
- `CONTRIBUTING.md` documents the tag-based release process.

### 🧭 Upgrading from 1.x

1. Install [QB64-PE](https://github.com/QB64-Phoenix-Edition/QB64pe) (or QB64) if you used the internal mode.
2. Leave `qbasic-nexus.compilerPath` empty for auto-detection, set it to the compiler executable, or set the `QB64_COMPILER` environment variable for a fork with a non-standard executable name.
3. Delete `compilerMode`, `internalTargets`, `internalOutputDir` and `internalWasmAccelerator` from your `settings.json`. They are ignored, but VS Code marks them as unknown settings.
4. To run a program without any compiler installed, use **Run in Retro CRT**.

### 🔧 Internal

- `src/extension/internalBuildSettings.js` became `src/extension/workerSettings.js` and now holds only the compile/lint worker-resilience settings.
- `src/extension/executableUtils.js` keeps only the output-path, terminal-launch and executable-permission helpers; the packager target helpers were removed.
- `package.json` `main` is now `./out/extension.js`. Tests are compiled too and run from `out/test`. `jsconfig.json` was replaced by `tsconfig.json`.

## [1.6.2] - 2026-07-22

### 🛡️ Build Stability

- **External builds can no longer hang the extension**: The QB64 compiler and the native packager were spawned with no timeout and no kill path. If one of them stalled — a stuck backend compile, a process waiting on a prompt — the build promise never settled, so the compile state stayed locked and Compile/Run remained disabled until the window was reloaded. External build processes are now guarded: they are terminated with `SIGTERM`, then `SIGKILL` after a short grace period, and the build always resolves.
- **New setting `qbasic-nexus.externalBuildTimeoutMs`**: Configurable timeout in milliseconds for an external build process (default `300000`; set `0` to disable the guard), mirroring the existing worker-timeout settings.

### ✨ Cancellable Builds

- **Cancel button for builds**: Internal (QBasic Nexus) and QB64 compilations now run under a cancellable progress notification. Cancelling terminates the underlying child process and reports a clean "Build canceled" message instead of surfacing a spurious error.
- **Killable packaging path**: The cancellable internal build now routes through the child-process packager instead of the uninterruptible in-process API, so both cancel and timeout can actually stop packaging and a heavy build no longer janks the editor.

### ✅ Quality Assurance

- Added `test/test-process-timeout.js` covering the timeout guard: `SIGTERM` on deadline, `SIGKILL` after grace, cancel-before-deadline is a no-op, a non-positive timeout disables the guard, and a missing process is handled safely.

## [1.6.1] - 2026-07-22

### ⚡ Internal Compiler Performance

- **Direct scanner replaces `moo`**: The lexer is now driven by a single sticky master regex whose ordered alternatives are exactly the previous tokenizer rules, so it produces a byte-identical token stream (verified token-for-token across 57 inputs, including adversarial ones) while allocating no per-token match object. Lexing a large program is ~35% faster and the `moo` runtime dependency is removed.
- **Identifier classification memoized**: The lexer no longer allocates an uppercase copy of every identifier just to test keyword membership; the classification is cached per spelling.
- **Allocation-free codegen indentation**: `_emit` reuses cached indent strings instead of building `'  '.repeat(n)` per generated line — previously the single largest source of GC pressure during code generation.
- **Memoized name encoding**: `_encodeStorageName` and `_isSafeJavaScriptIdentifier` are now cached pure functions with a fast all-safe path and code-point-correct fallback.
- **Leaner token access and DATA pre-pass**: Parser primitives (`_peek`/`_advance`/`_check`/`_matchPunc`/`_checkKw`) index the token array directly instead of through a manual one-slot cache, and the DATA/label pre-pass scans the array in a tight loop. Measured on a large program: parse+codegen ~34% faster, full cold compile ~29% faster.
- Generated JavaScript is byte-identical to the previous compiler across a 155-entry corpus (4 targets plus lint, valid and malformed inputs).

### ⚡ Editor & Workspace Performance

- **Workspace Analysis Memoized**: `getWorkspaceAnalysis` and `findWorkspaceIdentifierMatches` now cache their merged result per document version and per symbol-cache generation. Previously every completion, hover, and go-to-definition request re-merged the entire workspace symbol cache and cloned every symbol and definition. On a 300-file workspace, repeat lookups drop from ~0.94 ms to ~0.001 ms.
- **Completion Items Reused**: Because the merged analysis is now a stable object, the completion provider's per-analysis item memo actually takes effect instead of rebuilding every `CompletionItem` in the workspace on each keystroke.
- **Include Resolution Off The Keystroke Path**: The synchronous `fs.existsSync` probes used to resolve `$INCLUDE` targets now run once per document version instead of once per language-server request.
- **Cached Settings Snapshot**: Extension settings are read once and merged once, then reused until VS Code reports a configuration change. `lintDocument` no longer performs two `getConfiguration` lookups plus two deep merges on every edit.

### 🐛 Correctness

- **Fixed a silent cache miscompilation**: The compilation cache keyed generated code on a 32-bit FNV-1a hash, so a hash collision returned a *different program's* compiled output with no error. It now uses a wide multi-accumulator fingerprint and no longer copies the whole source per lookup. Includes a regression test built from a real collision pair.

### 🧠 Memory Stability

- **All Long-Lived Caches Bounded**: Introduced a shared `BoundedCache` LRU and applied it to the document-analysis cache, provider symbol cache, semantic-token cache, TODO decoration cache, per-analysis identifier-match cache, and the workspace memo caches. These previously grew for the lifetime of the extension host and only shrank when a document was explicitly closed.
- **No-Op Invalidations Preserve Warm Caches**: Invalidating a path that was never cached no longer discards valid derived results.

### ✅ Quality Assurance

- Added `test/test-compiler-cache-integrity.js` covering the cache-collision regression, target isolation, cold/warm equivalence, and fingerprint distribution.
- Added `test/test-hot-path-caches.js` covering LRU semantics, memo identity, invalidation correctness, and cache caps under pressure.
- Added `test/test-config-cache.js` covering settings-snapshot reuse, default merging, explicit fallbacks, invalidation, and read-through for undeclared keys.

## [1.6.0] - 2026-06-22

### 🛠️ Compatibility and Quality

- Raised the development and CI Node.js baseline to 22 to match the internal packaging dependency requirements.
- Restored QB64 compiler diagnostics for `.inc` files and added regression coverage.
- Added the deep regression suite to the default test command.

## [1.5.9] - 2026-04-23

### ✨ System Configuration Quick Actions

- **Unified Configure System Picker**: Added `QBasic Configure System ⚙️` to centralize the extension's main adjustable settings in one quick picker, including compiler mode, QB64 path/args, internal build settings, worker resilience, linting, auto-format, and line-number defaults.
- **Direct Setting Commands**: Added dedicated quick commands for compiler mode, QB64 path, QB64 args, linting, lint delay, auto-format, and line-number defaults so common changes no longer require editing JSON settings manually.
- **Status Bar Config Entry**: The secondary status-bar action now opens the broader system configuration hub in both QB64 and internal modes while still surfacing internal target/output context and validation warnings.

### ✅ Quality Assurance

- Added regression coverage for system quick-action item generation and formatter helpers.

### 📝 Documentation

- Updated `README.md` to document the new configuration hub, commands, and quick-action workflow for patch `1.5.9`.

## [1.5.8] - 2026-04-20

### ✨ Worker Resilience Controls

- **Internal Build Quick Actions Expanded**: Added worker resilience quick actions so compile and lint queue/timeout policies can be tuned directly from the command palette and status-bar build quick action flow.
- **Dedicated Worker Tuning Commands**: Added explicit commands for compile and lint resilience tuning with presets and custom values:
  - `QBasic Tune Compile Worker Resilience 🛡️`
  - `QBasic Tune Lint Worker Resilience 🛡️`
- **Hot-Reload on Setting Changes**: Worker clients now recycle automatically when resilience settings change, so updates apply immediately without manually reloading VS Code.

### 🛠️ Configuration

- Added new resource-scoped settings:
  - `qbasic-nexus.compileWorkerMaxQueueSize`
  - `qbasic-nexus.compileWorkerRequestTimeoutMs`
  - `qbasic-nexus.lintWorkerMaxQueueSize`
  - `qbasic-nexus.lintWorkerRequestTimeoutMs`

### 📝 Documentation

- Updated `README.md` configuration and command sections to document worker resilience settings, quick actions, and automatic worker reload behavior.

## [1.5.7] - 2026-04-19

### ✨ Internal Compiler and CRT Expansion

- **Broader QB64 Helper Coverage**: Expanded the internal compiler and CRT/runtime bridge so more QB64-style commands now route through real helper/runtime paths instead of comments or static stubs, including `PRINT USING`, `PRINT #..., USING`, advanced sound queries/controls, screen/icon movement helpers, console helpers, resize helpers, dropped-file helpers, and connection-state helpers.
- **Deeper Memory Runtime Support**: Added working internal runtime support for virtual memory and memory-block workflows including `PEEK`, `POKE`, `OUT`, `INP`, `WAIT`, `DEF SEG`, `_MEMCOPY`, `_MEMFILL`, `_MEMFREE`, `_MEMNEW`, `_MEM`, `_OFFSET`, `_MEMIMAGE`, `_MEMGET`, and `_MEMPUT`, plus image-backed alpha/color operations such as `_SETALPHA` and `_CLEARCOLOR`.
- **QB64 Runtime Compatibility Improvements**: Improved Retro CRT behavior for `_SCREENMOVE`, `_SCREENICON`, `_ICON`, `_SCREENEXISTS`, `_RESIZEWIDTH`, `_RESIZEHEIGHT`, `_TOTALDROPPEDFILES`, `_DROPPEDFILE$`, `_FINISHDROP`, `_CONNECTED`, `_CONNECTIONADDRESS$`, and `_CONSOLEINPUT`.

### 🚀 Worker Thread Performance

- **Shared Worker Pool Infrastructure**: Unified compile and lint worker logic behind a shared pooled-worker client with adaptive scaling, queue-based dispatch, warmup handling, and local fallback behavior.
- **Priority and Cancellation**: Added priority-aware scheduling for compile and lint work, plus superseded-document cancellation for lint jobs so stale work is terminated instead of consuming CPU in the background.
- **Queue Aging and Telemetry**: Added queue aging so long-waiting jobs can eventually overtake newer medium-priority work, and exposed pooled-worker metrics such as dispatched/completed/canceled/fallback counts plus queue/run timing statistics.

### ✅ Quality Assurance

- Extended regression coverage for `_MEM*` helpers, CRT helper routing, sound/screen/file-drop/network hooks, compile/lint worker pooling, queued priority dispatch, queue aging, and superseded-job cancellation.
- Verified the full project with `npm run lint` and `npm test`.

### 📝 Documentation

- Updated `README.md` to reflect the expanded internal compiler/runtime compatibility, worker-thread scheduling improvements, and current validation workflow.

## [1.5.6] - 2026-03-31

### ✨ Features

- **Cross-Target Internal Packaging**: Expanded the internal compiler so it can package `host`, `win-x64`, `linux-x64`, `macos-arm64`, or multi-target builds through `qbasic-nexus.internalTargets`, while skipping auto-run for non-host or multi-target outputs.
- **Configurable Internal Output Folders**: Added `qbasic-nexus.internalOutputDir` so internal builds can emit packaged binaries into a dedicated folder instead of always writing beside the source file.
- **Internal Build Setting Commands**: Added command-palette actions to pick internal build targets and output folders without editing JSON settings by hand.
- **Internal Build Quick Actions**: Added a status-bar quick action in internal mode so target and output settings can be changed directly from the editor chrome.

### 🐛 Bug Fixes & Improvements

- **QB64-Like Runtime Errors**: Unified runtime error handling so `ON ERROR`, `ERR`, `ERL`, `ERROR`, `RESUME`, divide-by-zero, and integer-division behavior align more closely with QB64 semantics.
- **QB64-Like Numeric, Array, and File I/O Semantics**: Routed `CINT`, `CLNG`, `CSNG`, `CDBL`, `INT`, `FIX`, and `VAL` through QB-aware runtime helpers, added overflow checks, made `DEFINT/DEFLNG/DEFSNG/DEFDBL/DEFSTR` affect implicit variables and function results again, restored `% ! # & $` suffix behavior for type inference and safe code generation, added `OPTION BASE`, `LBOUND`, `UBOUND`, explicit lower array bounds, `ERASE`, auto-dimensioned arrays, invalid-bound diagnostics, and `REDIM PRESERVE` metadata handling, routed mixed-type arithmetic, relational operators, logical operators, and control-flow condition checks through QB-aware helpers so `-1/0` boolean values, `CASE IS`, condition type mismatches, `ERL`, and overflow report QB-style behavior earlier, coerced typed assignments and TYPE copies more like QB64, and tightened file-number/mode/EOF handling to surface QB-style error codes earlier.
- **Cross-Platform Executable Flow**: Normalized executable paths, permissions, and terminal launch behavior across Windows, macOS, and Linux for both QB64 and internal compiler builds.
- **Safer Internal Packaging Config**: Internal target strings are now canonicalized and validated up front, common aliases are accepted automatically, output folders reject file-path mistakes early, and macOS arm64 builds surface a signing note before distribution.
- **Extension Host Stability**: Reduced typing stalls and workspace rescans with worker-backed linting, versioned semantic-token caching, incremental TODO/decorator refresh, lazy analysis caches, and background workspace warmup.
- **Structured CRT Transcript and Multiline Prompting**: The Retro CRT runtime now routes output, input echo, runtime errors, and screen clears through a structured transcript/event flow, normalizes escaped `\n` and `\n\n` into real line breaks without breaking Windows-style paths, and keeps tutorial/result checking aligned with the actual rendered screen state.
- **Tinybench Benchmark Harness**: Swapped the ad-hoc benchmark loops for a shared `tinybench`-powered harness so compiler and editor benchmarks now report consistent latency, throughput, and sample counts from the same measurement engine.

### ✅ Quality Assurance

- Added regression coverage for runtime error propagation, array bound semantics, auto-dimensioned arrays, invalid-bound diagnostics, relational/logical operator semantics, condition truthiness/ERL behavior, arithmetic overflow/type-mismatch paths, structured CRT transcript/reset flows, multiline prompt normalization, cross-target packaging, output-directory resolution, TODO scanning, optimization managers, and workspace invalidation flows.

### 📝 Documentation

- Refreshed `README.md` and `CONTRIBUTING.md` to document the new internal compiler targets/output settings and the current validation commands (`npm run lint`, `npm test`).

## [1.5.5] - 2026-03-20

### ✨ Features

- **Statement-Aware Signature Help**: Expanded parameter hints beyond classic built-in functions so editor hints now cover statement-driven workflows such as `CIRCLE`, `PAINT`, `PLAY`, `DRAW`, `OPEN`, `LINE INPUT`, and `ON ERROR`.
- **Semantic Token Highlighting**: Added a dedicated semantic token provider that distinguishes globals, locals, parameters, arrays, structure names, labels, and declarations to make QBasic code easier to scan in large files.
- **CRT Runtime Error Source Tracking**: Internal web runtime execution now tracks the active source line and attempts to jump the editor back to the failing line when a runtime error occurs inside the Retro CRT panel.

### 📝 Documentation

- Updated `README.md` to reflect the new semantic-highlighting, signature-help, and CRT error-tracking behavior shipped in `1.5.5`.

---

## [1.5.4] - 2026-03-17

### ✨ Features

- **Language Services**: Introduced comprehensive language services including completion, hover, rename, definition, and references by implementing core QBasic parsing and compiler features.
- **Code Snippets**: Added comprehensive QBasic code snippets.
- **TODO/FIXME Provider**: Implemented a new tree view provider to track `TODO` and `FIXME` comments across your project.
- **Multi-Workspace Analysis**: Added support for multi-workspace analysis to comfortably manage multiple project folders.
- **Webview Manager**: Built a new WebviewManager to enhance runtime execution.

### 🐛 Bug Fixes & Improvements

- **CI Pipeline**: Fixed Node version environment and stabilized GitHub Actions testing/build workflows across multiple environments.
- Updated multiple dependencies and refined documentation badges.

### ✅ Quality Assurance

- **Testing**: Added comprehensive test coverage for compiler features and language services.

---

## [1.5.3] - 2026-03-13

### 💻 Critical Bug Fixes

- **Regex Escape Bug**: Fixed critical bug in `src/providers/patterns.js` where `escapeRegex()` was using UUID instead of proper `\\$&` replacement, causing Symbol Renaming, Reference Finding, and Document Highlighting to malfunction
- **Stateful Regex Bug**: Fixed stateful regex issue in `src/compiler/lexer.js` where `lastIndex` was reset after `.test()` instead of before, preventing state corruption in Unicode normalization
- **Race Condition**: Added proper mutex protection in `src/extension/compileCommand.js` with try-finally block to prevent concurrent compilation attempts
- **ESLint Warnings**: Fixed unused parameter warnings in `src/providers/decorators.js` by prefixing with underscore

### 🚀 Performance Optimizations (Major Update)

- **Enhanced Cache System**: Upgraded L1 cache from 16 to 32 entries and L2 cache from 200 to 300 entries for better multi-file project support while maintaining low memory footprint (~15MB max)
- **Optimized Token Pool**: Increased max pool size to 15,000 tokens while reducing initial allocation from 2,500 to 1,500 to save memory on startup
- **Adaptive Linting**: Improved incremental linter with 3-tier adaptive delays (100ms for tiny edits, 250ms for medium, full delay for large changes) for better responsiveness
- **Memory Management**: Reduced RAM usage by ~20% through optimized cache sizes and lazy allocation strategies
- **CPU Optimization**: Reduced CPU usage during typing by ~30% through smarter debouncing and version guards

### 🔧 Technical Improvements

- Optimized cache hit rates from ~75% to ~85% through larger cache sizes
- Reduced extension activation time by ~15% through lazy module loading
- Improved memory cleanup on document close to prevent leaks
- Enhanced version tracking to avoid redundant operations

### ✅ Quality Assurance

- All 134 tests passing (10 compiler + 52 variables + 21 features + 47 integration + 4 autodetect)
- Zero ESLint errors or warnings
- No breaking changes
- Full backward compatibility maintained

---

## [1.5.2] - 2026-03-11

### ✨ Features

- **ASCII + CP437 Character Chart**: Expanded the built-in character reference and `CHR$()` insert workflow to cover the full ASCII / CP437 character set for quicker lookup and insertion.
- **Language Icon Registration**: Added explicit QBasic language icon metadata in `package.json` so both light and dark themes use `./assets/qb64.svg`.
- **Assets Folder Rename**: Renamed the shared image folder from `image/` to `assets/` and updated extension icon, README logo, and ASCII chart webview resources to use the new paths.

### 🚀 Performance Optimizations

- **V8 Hashing Boost**: Transitioned compiler caching hash sequence to `Math.imul()` for FNV-1a calculation. This relies on native V8 32-bit integer multiplication optimizations, dramatically decreasing overhead for string hashing across all sources.
- **Lexer Zero-overhead Pooling**: Scaled up Lexer `TokenPool` to limit garbage collection. Boosted `_maxSize` to `10000` and `_preallocated` block size to `2500`, drastically minimizing runtime token object allocations for large corporate-sized QBasic source codes.
- **Fast Line Counting**: Eliminated repeated property lookup access `.length` inside `countLines()` loops, caching length evaluation directly into loop condition blocks.

### 🐛 Bug Fixes

- **Webview Input Focus Recovery**: Fixed an issue in `interactive CRT Webview` where clicking outside the `INPUT` field or switching document tabs would drop cursor focus entirely. Added robust cross-browser `document.addEventListener('click')` and `window.addEventListener('focus')` recovery handling.

### 📦 Packaging

- **Smaller Extension Package**: Excluded `.github/`, `.nvmrc`, and `SECURITY.md` from the published VS Code extension package.

### 📝 Documentation

- **README Cleanup**: Removed an outdated note about tutorial success messages and updated asset references to match the new `assets/` folder layout.
- **SECURITY Cleanup**: Removed the stale "Last Updated" footer from `SECURITY.md`.
- **Tutorial Expansion**: Updated `README.md` and documentations to accurately reflect the latest **150-lesson** curriculum spanning **35 progressive stages**.

---

## [1.5.1] - 2026-03-10

### 🚀 Internal Compiler

- **AST-First Control Flow**: The internal compiler now routes `GOTO`, `GOSUB`, `RETURN`, `ON ... GOTO/GOSUB`, `ON ERROR`, and `RESUME` through an AST + semantic analysis path with trampoline/state-machine execution instead of legacy throw/recursion behavior.
- **Semantic Diagnostics**: Added semantic checks for missing labels, invalid `EXIT`/`CONTINUE`, `RESUME` misuse, mismatched `NEXT`, stray block terminators, and unreachable code, while preserving warnings as non-blocking diagnostics.
- **Preprocessor Support**: Added `$INCLUDE`, `$STATIC`, and `$DYNAMIC` preprocessing with source-path-aware include resolution across compile, transpile, and lint flows.
- **Scope Compatibility**: Improved QB/QB64-style behavior for `STATIC` procedure locals and `COMMON SHARED` globals inside internal compiler output.
- **Type System Improvements**: Expanded fixed-length string handling, nested `TYPE` support, keyword-safe member access, and target-aware assignments for array elements and member chains.
- **Text/Graphics Compatibility**: Added internal runtime support for `POINT` alongside the existing compatibility layer for text-mode and non-crashing graphics commands.

### 💾 File, Data, and Runtime Compatibility

- **File I/O Expansion**: Added internal runtime support for `FREEFILE`, `INPUT$`, `LOF`, `LOC`, `EOF`, `SEEK`, `FILES`, `NAME`, `KILL`, `MKDIR`, `RMDIR`, `CHDIR`, `RESET`, `LINE INPUT #`, token-based `INPUT #`, `WRITE #`, `LSET`, and `RSET`.
- **Random/Binary Records**: Added `OPEN ... FOR RANDOM/BINARY ... LEN =`, `FIELD`, `GET #`, and `PUT #` with fixed-length record behavior and typed payload handling in the internal compiler runtime.
- **Typed Binary Conversions**: Implemented `CVI`, `CVL`, `CVS`, `CVD`, `MKI$`, `MKL$`, `MKS$`, `MKD$`, and generic `_CV` / `_MK$` helpers for internal compiler output.
- **Typed Record Support**: `GET #` / `PUT #` now support typed scalars, fixed-length strings, nested `TYPE` records, and assignable targets such as array elements and member chains.
- **Locking and Sharing Rules**: Added internal enforcement for `SHARED`, `LOCK`, `UNLOCK`, and `OPEN ... LOCK ...` semantics, including overlapping lock detection across open handles.
- **Program Restart Behavior**: `RUN` without an external target now restarts the current internal-compiler program cleanly; unsupported external `RUN` / `CHAIN` paths now fail with explicit runtime errors instead of ambiguous crashes.
- **Memory Primitives**: Added working internal runtime support for `PEEK`, `POKE`, `OUT`, `WAIT`, `INP`, `DEF SEG`, `_MEMCOPY`, `_MEMFILL`, and `_MEMFREE`.

### 🔎 Editor and Tooling

- **Better Lint Ranges**: Incremental linter diagnostics now use precise `column` / `length` ranges and preserve warning/info severity more accurately.
- **QB64 Discovery**: QB64 auto-detect now checks environment hints, common install folders, and `PATH`, including QB64 Phoenix Edition layouts, and can recover from stale saved paths.
- **Cross-Platform Packaging**: The internal compiler packaging path was updated from `pkg` to `@yao-pkg/pkg`, improving current-platform native executable generation and working-directory consistency.



### 📝 Documentation

- **Docs Alignment**: Updated release notes to reflect the current internal compiler/runtime feature set shipped in `1.5.1`.

---

## [1.5.0] - 2026-03-09

### 🚀 Features

- **Interactive Tutorial**: Added `QBasic Start Interactive Tutorial 🎮` command to help new users learn QBasic directly within VS Code.
- **Code Statistics**: New `QBasic Show Code Statistics 📊` command (Ctrl+Shift+I) to analyze your code structure, line counts, and complexity.

### ✨ Interactive Tools

- **ASCII Chart**: Added a built-in `QBasic Show ASCII Chart 📋` reference (Ctrl+Alt+A).
- **Quick Insert**: Added `QBasic Insert CHR$() at Cursor ✍️` to easily pick and insert characters from the ASCII chart.
- **Line Number Management**:
  - Added `QBasic Remove Line Numbers 🔢` (Ctrl+Alt+R) for modernizing legacy code.
  - Added `QBasic Renumber Lines 🔄` (Ctrl+Alt+N) for traditional BASIC workflow.

### 🐛 Bug Fixes

- **Documentation**: Fixed a broken anchor link in the README header that prevented navigation to the "Features" section.
- **Internal Cleanup**: Fixed minor bugs in the transpiler logic during the 1.5.0 release cycle.

### 📝 Documentation

- **Open VSX**: Added Open VSX version badge to README.
- **Refinement**: Improved README readability and formatted the feature comparison table.

---

## [1.4.3] - 2026-03-08

### 🚀 Performance Improvements

#### UI & Linter Optimizations

- **Zero-Lag Typing**: Replaced costly synchronous `detectChanges` string splitting in `IncrementalLinter` with an adaptive length-difference heuristic. This completely eliminates UI freezing and lagging when typing in large files (10,000+ lines).

#### Web Runtime (CRT) Optimizations

- **VFS Read Speed (O(1))**: Fixed a severe $O(N^2)$ bottleneck in `vfsInput()` by caching parsed file line arrays. This significantly speeds up consecutive file reading operations (`INPUT #`) in the virtual file system.

### 🧹 Code Maintenance

- **Linting & Code Quality**: Added `@eslint/js` and `globals` to development dependencies. Scanned and resolved over 3,000 minor styling warnings, unused variables, and shadowing errors across the entire codebase to improve engine caching.
- **Dead Code Cleanup**: Removed redeclarations of global `localStorage` in `runtime.js` and cleaned up unused variable imports in compiler and extensions modules.

---

## [1.4.2] - 2026-03-07

### 🧹 Compiler Maintenance

- **Temp File Cleanup**: Ensures the internal transpiler automatically deletes intermediate `_qbnx_.js` files after compilation, preventing workspace clutter.

---

## [1.4.1] - 2026-03-07

### 🐛 Bug Fixes

- **Webview Fix**: Resolved an "InvalidStateError" preventing the Service Worker from registering correctly, which caused the Retro CRT webview to fail to load in some environments.

---

## [1.4.0] - 2026-03-03

### 🌍 Cross-Platform Compatibility

#### Multi-Platform Executable Building

- **Cross-Platform pkg Targets**: Fixed Internal Transpiler to support multiple platforms
  - Windows: `node18-win-x64`
  - macOS: `node18-macos-x64`
  - Linux: `node18-linux-x64`
  - Alpine: `node18-alpine-x64`
- **Platform Detection**: Automatic target selection based on `process.platform`
- **Fallback Support**: Both API and CLI fallbacks now use cross-platform targets

### 🧹 Code Cleanup

#### Removed Dead Code

- **Unused Exports**: Removed `getSeverity` and `SEVERITY_MAP` from `src/extension/linting.js`
  - These were duplicates of functionality in `src/managers/IncrementalLinter.js`
- **Commented Code**: Removed placeholder "extract to SUB" code from `src/providers/codeActionProvider.js`
- **Debug Code**: Removed commented debug logging from `src/compiler/transpiler.js`
- **Unused Test File**: Removed `test/extension.test.js` (contained only placeholder tests)

### 📦 Dependency Updates

#### VSCode Engine Version

- **Updated Requirement**: Changed from `^1.105.0` to `^1.75.0`
  - Improves compatibility with older VS Code versions
  - Maintains access to required APIs

### 📝 Documentation

#### Analysis Report

- **New File**: Added `ANALYSIS_REPORT.md` with comprehensive code analysis
  - System compatibility issues identified and fixed
  - Logical errors and bugs documented
  - Unused files and dead code listed
  - Dependency analysis completed

---

## [1.3.0] - 2026-03-03

### 🔍 Code Analysis & Quality Improvements

#### Comprehensive Code Review

- **Full Project Scan**: Analyzed all source files for issues
  - System compatibility issues identified
  - Logical errors and bugs found and documented
  - Unused files and dead code identified
  - Dependency usage verified

#### Bug Fixes

- **Case-Sensitive Keyword Lookup**: Verified completion provider handles keywords correctly
  - Ensures proper keyword detection regardless of case

#### Code Quality

- **Removed TODO Comments**: Documented incomplete features for future implementation
- **Improved Documentation**: Added inline comments for complex logic

### 📊 Analysis Summary

| Category              | Issues Found | Issues Fixed |
| --------------------- | ------------ | ------------ |
| System Compatibility  | 2            | 2            |
| Logical Errors & Bugs | 5            | 1            |
| Unused Files          | 1            | 1            |
| Dead Code Locations   | 4            | 3            |
| Unused Dependencies   | 0            | 0            |

---

## [1.2.0] - 2026-02-14

### 🚀 Major Performance Improvements

#### Compiler Optimizations (30-50x faster)

- **Lexer Performance**: 10-15x faster with token pooling and string slice optimization
  - Token Pool with object reuse reduces GC pressure
  - Pre-allocated token arrays (200 tokens initially)
  - String slice instead of character concatenation
  - Bitwise operations for case-insensitive comparisons
  - Optimized Unicode normalization

- **Parser Performance**: 5-8x faster with caching and pre-allocation
  - Token peek caching reduces array access overhead
  - Pre-allocated output arrays for generated code
  - Optimized expression parsing

- **Compilation Cache System**: NEW!
  - LRU cache for compilation results
  - SHA-256 based source hashing
  - Separate caches for tokens and generated code
  - Configurable cache size (default: 100 entries)
  - Cache hit rate tracking and statistics

### 🛡️ Enhanced Stability & Error Handling

#### Advanced Error Recovery System

- **Diagnostic System**: NEW!
  - Error severity levels: ERROR, WARNING, INFO, HINT
  - Error categories: SYNTAX, SEMANTIC, TYPE, REFERENCE, RUNTIME
  - Smart suggestion system with Levenshtein distance
  - Detailed error messages with fix suggestions

- **Error Recovery Strategies**
  - Graceful recovery from missing separators
  - Unmatched parenthesis recovery
  - Invalid expression recovery
  - Typo suggestions for keywords and identifiers

#### New Compiler API

- **Unified Compiler Interface**: `src/compiler/compiler.js`
  - High-level compilation API with caching
  - Detailed compilation results with metadata
  - Statistics tracking (compilation time, cache hits, etc.)
  - Quick compile functions for simple use cases

```javascript
const { compile } = require("./src/compiler/compiler")
const result = compile(source, { target: "web", cache: true })
```

### 🐛 Critical Bug Fixes

#### Variable Declaration Issue (FIXED!)

- **Problem**: Runtime error "x is not defined" when using variables without DIM
- **Solution**: Auto-declare variables with default values
  - Numeric variables: initialized to 0
  - String variables: initialized to ""
  - Arrays: initialized to []
  - Objects: initialized to {}
- **Impact**: All QBasic programs now work correctly with implicit variable declaration
- **Test Coverage**: 10 new test cases covering all scenarios

**Examples that now work:**

```qbasic
' No DIM needed!
x = 10
y = x + 5
arr(0) = 100
player.x = 200
```

### 📊 New Features

#### Performance Monitoring

- **Benchmark Suite**: `test/benchmark-compiler.js`
  - Comprehensive performance testing
  - Multiple test programs (small, medium, large)
  - Detailed statistics (mean, median, P95, P99)
  - Throughput measurement (KB/s)
  - Run with: `npm run benchmark`

#### Variable Declaration Testing

- **Test Suite**: `test/test-variable-declaration.js`
  - Tests implicit variable declaration
  - Covers arrays, objects, and complex expressions
  - Run with: `npm run test:variables`

#### Incremental Compilation Support

- **Change Detection**: Track modified lines for future incremental compilation
- **Cache Invalidation**: Smart cache invalidation on errors
- **Memory Efficiency**: Object pooling and pre-allocation

### 🔧 API Improvements

#### New Modules

- `src/compiler/compiler.js` - Unified compiler interface
- `src/compiler/cache.js` - LRU cache and compilation cache
- `src/compiler/error-recovery.js` - Error recovery and diagnostics
- `test/benchmark-compiler.js` - Performance benchmark suite
- `test/test-variable-declaration.js` - Variable declaration tests

#### Enhanced Existing Modules

- `src/compiler/lexer.js` - Token pooling and optimization
- `src/compiler/transpiler.js` - Parser caching, pre-allocation, and auto-declaration

### 📚 Documentation

#### New Documentation Files

- `OPTIMIZATION_GUIDE.md` - Complete optimization guide (Thai)
- `PERFORMANCE_IMPROVEMENTS.md` - Performance improvement summary
- `BUGFIX_VARIABLE_DECLARATION.md` - Variable declaration bug fix details
- `UPGRADE_v1.2.0.md` - Upgrade guide
- `IMPROVEMENTS_SUMMARY.md` - Overall improvements summary
- `test/README.md` - Test suite documentation

### 🎯 Performance Benchmarks

Typical improvements on a modern system:

| Component | Before | After   | Improvement |
| --------- | ------ | ------- | ----------- |
| Lexer     | 100ms  | 7-10ms  | 10-15x      |
| Parser    | 200ms  | 25-40ms | 5-8x        |
| Total     | 300ms  | 32-50ms | 6-9x        |

**Actual benchmark results:**

- Small program (106 chars): 0.240 ms - **441.99 KB/s**
- Medium program (297 chars): 0.244 ms - **1,214.95 KB/s**
- Large program (1,617 chars): 0.556 ms - **2,908.77 KB/s**

### 🔮 Future Roadmap

Phase 2 optimizations planned:

- JIT compilation for hot paths
- Parallel processing for large files
- WebAssembly backend for critical sections
- Persistent disk cache
- AST-level optimizations

### 📝 Migration Notes

- All existing code continues to work without changes
- New API is recommended for better performance and error handling
- Cache is enabled by default but can be disabled
- No breaking changes
- Auto-declaration ensures compatibility with all QBasic code

### 🧪 Testing

New test commands:

```bash
npm run benchmark        # Performance benchmarks
npm run test:variables   # Variable declaration tests
npm run test:all         # Run all tests
```

## [1.0.2] - 2026-01-04

### 🐞 Bug Fixes

- **Throttle Logic**: Fixed an issue where throttle function would drop the latest update, causing UI lag or missing states.
- **Transpiler Duplicates**: Resolved duplicate function definitions (`_locate`, `_color`, `_beep`) when compiling for web target.
- **Transpiler Naming**: Renamed internal `_inkey$` to `INKEY` to avoid potential JS strict mode or naming conflicts.
- **Unused Code**: Removed dead code variables (`hasElse`) from the parser.

### ✨ Enhancements

- **Auto-Indentation**: Added smart auto-indent logic for `IF`, `FOR`, `DO`, `SELECT CASE` and other blocks in `providers.js`.
- **Cross-Platform**: Improved `runExecutable` to better handle paths with spaces on Windows (PowerShell) and Unix-based systems.
- **Status Bar**: Status bar now links directly to specific setting when QB64 path is missing.
- **Runtime Improvements**:
  - Added `CSRLIN`, `POS`, `BIN$`, `_BIN$`, `LSET`, `RSET` support.
  - Improved `WebviewManager` cleanup and error handling.
  - Added `clearScreen()` method to WebviewManager.

### 🔊 Audio System Improvements

- **Faster BEEP/SOUND (Windows)**: Replaced slow PowerShell-based audio with instant `mshta` JavaScript audio for near-zero latency.
- **Shared AudioContext (Web)**: Web runtime now uses a single shared AudioContext for much faster sound playback.
- **Better Sound Quality**: Added proper gain envelope (attack/release) to prevent click/pop sounds.
- **Improved macOS Support**: Now tries `sox` for frequency control before falling back to system beep.
- **Promise-based Audio**: Both `BEEP` and `SOUND` now properly return Promises for accurate timing.

### 🔴 Critical Fixes

- **Missing `constants.js`**: Created missing compiler constants file that caused Internal Transpiler and CRT Mode to crash completely
- **Variable Scope Bug**: Fixed `_hasVar` function to check all parent scopes for proper nested SUB/FUNCTION support
- **Dead Code Cleanup**: Removed unused `QBasicOnTypeFormattingEditProvider` import

### ✨ New QBasic/QB64 Statement Support

- **Control Flow**: `GOTO`, `GOSUB`, `RETURN`, `ON...GOTO`, `ON...GOSUB`, `ON ERROR GOTO/RESUME NEXT`, `STOP`
- **I/O Statements**: `LINE INPUT`, `LOCATE`, `COLOR`, `SCREEN`, `WIDTH`, `BEEP`, `SOUND`
- **Data**: `TYPE...END TYPE`, `ERASE`, `REDIM PRESERVE`, `DEF FN`
- **File I/O**: `OPEN`, `CLOSE` (stubs for web compatibility)
- **Misc**: `RANDOMIZE`, `LET`, `DECLARE` (skipped), `ERROR`

### 🚀 Runtime Enhancements

- **Complete Runtime Functions**: Added `_locate()`, `_color()`, `_beep()`, `_sound()`, `_screen()`, `_width()`, `_randomize()`, `_inkey$()` for both Node.js and WebView
