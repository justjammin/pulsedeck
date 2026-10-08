# Task 2 report

Implemented CAVA injectable source, real Node developer process/filesystem port, versioned preferences and native Demo/control adapter. No core changes. Native audio remains a ruled integration blocker, not solved capture acceptance.

## API and ownership

- `createCavaSource(port, {executable})`: start(audio, outputConfig, callbacks) returns awaited idempotent stop; dispose awaits pending startup and cleanup. Failed child stop/config remove retains ownership for explicit retry and blocks a successor. Parser storage is bounded; no frame queue is retained.
- Port: available/reason/outputAuto, check(executable), createConfig(text)->{path,remove}, spawn(argv,{stdout,stderr,exited})->{stop}. Backends are explicitly declared verified capabilities, never inferred from executable presence/version.
- `createNodePort({backends,outputAuto})`: standalone Node-only developer adapter, explicit executable, argv without shell; read-only -v (2-second timeout), 4096-character streamed callbacks, 2048-character version/diagnostic collection, owned mkdtemp/config0600, SIGTERM then SIGKILL and awaited close. No native module imports it.
- `createPreferences(store)`: load/save/reset over get/set/delete, key pulsedeck.preferences.v1, version1, 2048 UTF-8 byte cap; only preset/motion/source/layout; no active authorization; malformed data defaults.
- `register(on)`: session-local closure/controller, documented literal host calls. Async clock.now cached synchronously for core and refreshed before each timer callback, callbacks overlap-gated and cancellation-aware. Commands return {} and never call model or command.run. Demo, stop, status, setup, preset, motion, validated source, expand/compact/reset controls. Pane close compacts and preserves running Demo. Expanded layout restores only after explicit open.
- AbovePrompt awaits next once and preserves other content. Survey/other panes pass through. Raster terminal-only, immediate little-endian packing of borrowed core RGBA into width-one full-block cells and standard padded base64, no Node globals. Desktop text fallback. Button uses documented label/key/onPress.

## RED/GREEN evidence (exact commands)

1. `node --test test/cava.test.js test/preferences.test.js`: RED 0/6, assertions found missing exported APIs; GREEN 6/6 after implementation.
2. `node --test test/node-process.test.js`: RED 0/2 missing API; GREEN 2/2 using actual Node children/streams/kill and temp filesystem. The streaming assertion requires all 30000 bytes and chunks <=4096.
3. `node --test test/host.test.js`: RED 0/2 missing register; GREEN 2/2 mock flow after implementation.
4. `node --test test/cava.test.js test/host.test.js`: 9/10; added explicit-layout restoration regression RED (expected one opened pane, actual zero). GREEN after restoring saved expanded layout only on explicit open.
5. `node --test test/host.test.js`: 3/4; reset/close interaction regression RED (native-like ui.close recreated preference key). GREEN 4/4 after awaiting pane close before deleting preferences.
6. `node --test`: final full-suite result recorded below, includes original core/parser/lifecycle suites and Task2 integration tests.

Additional existing-behavior regression checks cover capability rejection before config allocation, bundled-output-auto double attestation and config-remove retry ownership; these were green on addition and required no production changes.

## Limits and unresolved acceptance

No native Claude or actual CAVA executable/audio server was available. Host mocks establish application flow, not native ABI/render/command namespacing validity. Exact target-generated spawn/kill/temp contracts remain unknown. Native Audio displays a user-facing preview notice and Setup points maintainers to /plugin-types. No microphone fallback or capture probe occurs. No vendored binaries exist; Task3 must build audited runnable payloads, resolver/release gate and dependency notices before the one-install requirement is accepted. Current hooks/register.js imports local modules for development; release must use Task3 single-file bundle unless target host local-import support is verified.

Official sources rechecked: current mods reference/ui guide for Button/ui.close and upstream cava.c for -v/-p. The public type-version mismatch remains unresolved. Runtime no external dependencies/network/telemetry.

Final verification: `node --test` exited 0: **44 tests passed, 0 failed** (the count includes Node's test/helpers.js file discovery entry). `git diff --check` clean. No native/live-audio claims made.

## Task2 review fixes

Four review findings were reproduced and corrected without core changes or relaxing native Audio/bundled CAVA gates.

- Source cleanup has a shared in-flight promise per owner. Concurrent Stop/Dispose executes child stop and config removal once; rejection clears the in-flight promise while retaining resources for explicit retry. Successful Node config handles likewise share removal.
- New host-safe diagnostic helper sanitizes ANSI/C0/C1/DEL/bidi controls and limits retained/emitted diagnostics in UTF-8 bytes. Emitted source/Node check wrappers fit the same 2048-byte cap, including multibyte Unicode.
- AbovePrompt captures controller and lifecycle epoch before awaiting downstream content; retired renders return that content directly. Awaiting actions recheck lifetime before controller/preference updates. Old Button callbacks cannot recreate a session after disposal; close preference saves recheck lifetime.
- Node createConfig retains failed-write/failed-remove temporary owners and carries `error.cleanup.remove` for source adoption. New allocation/capture is blocked pending explicit cleanup. Node exposes retryCleanup/pendingCleanupCount; source disposal retries the adopted handle. After disposal succeeds a fresh source can capture using the port. This is a narrow application contract extension, never an invented native API.

Review RED command: `node --test test/cava.test.js test/node-process.test.js test/host.test.js` -> 14 passed, 5 failed. Concurrent child stop count 3 rather than1, >2048-byte Unicode source/Node diagnostics, AbovePrompt null dereference, and fault-injected createConfig missing rejection confirmed the findings. The expand-await retirement check was green on addition (old catch swallowed its null dereference); lifetime guards additionally prevent stale mutations.

Focused additional RED: `node --test --test-name-pattern='retired Button' test/host.test.js` with unguarded original callback behavior -> 0/1, two timers recreated rather than zero; restored epoch guard. `node --test --test-name-pattern='successful config handles' test/node-process.test.js` -> 0/1, two removals rather than one; shared removal fixed it.

Focused GREEN: `node --test test/cava.test.js test/node-process.test.js test/host.test.js` -> 23 passed, 0 failed, including source/Node failed-allocation ownership integration and overlapping rejected cleanup retry. Final full-suite result follows.

Review final verification: `node --test` exited0, **54 passed / 0 failed** (includes helpers.js discovery). `git diff --check` clean. Native ABI/capture and actual bundled supported-platform release artifacts remain unverified as before.

Final branch review's scoped version-probe ownership fix is documented in final-fix-report.md: owner registered before spawn; two-second timeout/late spawn and rejected stop retain retryable ownership; pending barrier blocks new probes/capture; existing error.cleanup adoption applies. Final full suite62/62, development build succeeds and release remains correctly blocked.
