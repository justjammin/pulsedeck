# PulseDeck Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Use medium reasoning as requested by the user.

**Goal:** Build a dependency-free Claude Code music visualizer development preview and provide reproducible verification and review artifacts.
**Architecture:** One source-owning controller, bounded parser and frame buffers, three Strategy renderers, a narrow Claude host Adapter, versioned preferences. No backend.
**Tech Stack:** JavaScript ESM, JSDoc contracts, Node native tests; host-side restricted JavaScript APIs only. Do not install packages.
**Spec:** .scratch/pulsedeck/spec.md and design/01-prd.md through design/06-requirements-traceability.md.

## Global Constraints

- Explicit Start only; open starts stopped. One source and one rendering timer, idempotent start/stop, reject late generations. No microphone fallback, shell invocation, recording, network or telemetry.
- Frame: 32 integer bands 0..255 delimited by semicolons and newline; optional final semicolon and CRLF; latest frame wins. Parser pending cap4096 bytes, diagnostic cap2048 bytes.
- Render cap128x48, two reusable RGBA buffers, 48 particles max; steady-state buffer ownership bounded. Compact10FPS, expanded20FPS, reduced motion and silence2FPS. Labels explain source and state, demo always visible.
- User approved resuming this existing scoped build. Local tracker/CLAUDE.md proposal accepted through that resume. No external publishing. Real host/audio release validation remains blocked until demonstrated.
- Meaningful RED then GREEN tests before new behavior. Record commands/failures/passes. No subagent spawning by workers. Commit each task, focused self-review, full suite once per task.
- No claims of generated native typecheck or host validity absent the actual host. Product adapters must follow primary official docs, and uncertain contracts must remain flagged rather than invented.

## Review Focus

Lifecycle races and errors, stream bounds, labeling, source config injection, reusable buffers, native API fidelity and honest evidence. Tests at controller/view boundary with fake source/clock; host mocks establish contract intent only.

## Task 1: Bounded visualizer engine and demo

This implements engine portions of tickets01/03/04/05/07; real-host criteria remain pending. Read the spec plus relevant design documents. Work in this repository.

Files: package.json (type module, npm test uses node --test); src/core/controller.js; src/core/parser.js; src/core/raster.js; src/core/presets.js; src/sources/demo.js; test/core.test.js; test/parser.test.js; test/helpers.js. Additional focused test files allowed. No host integration yet.

Interfaces: export createController({clock, sourceFactory, invalidate, preferences?}); clock has now():milliseconds and every(milliseconds,callback):cancel function. sourceFactory.start(kind, config, {frame,error,end}):Promise<handle>; handle.stop():Promise<void>. Controller public async start(kind='audio'), async stop(), open(), expand(boolean), setPreset('spectrum'|'ocean'|'grid'), setMotion('full'|'reduced'), setSource(config), snapshot(), render(width,height), dispose(). snapshot includes state, sourceKind, preset, expanded, motion, message and metrics. frame callback accepts Uint8Array32. Controller owns reusable normalized/smoothed/peak Float32Array32; render returns {width,height,rgba:Uint8Array,label} with bounded dimensions and reusable storage. Source config changes stop and require Start. Unavailable real source yields useful Error, not demo fallback.

Parser export createParser(onFrame), push(string|Uint8Array), reset(), metrics(); accepts split/coalesced frames, discards malformed/oversized until newline and resumes, clamps neither bad count nor bad values; reusable last Uint8Array32, no chunk retained. Pending memory stays capped even megabyte chunks. Decode byte-wise, do not keep whole chunks in parser state. Demo source uses injected clock to emit deterministic plausible bands; exports createDemoSource(clock).start(kind,config,callbacks), supports disposal.

- [ ] Write failing tests for open-stopped, demo labeling, explicit start, one producer, async start/stop and old callbacks, source replacement, timer disposal, preset and expansion changes, silence transition/recovery, errors/end.
- [ ] Write parser failing tests for split/coalesced/malformed/CRLF/trailing separator, wrong counts/values, oversize recovery, latest frame behavior.
- [ ] Implement controller and bounded parser. Silence detects low energy sustained, and missing frames timeout produces Waiting/Error with actionable message; define documented threshold/timeout values. Timer scheduling switches without parallel timers.
- [ ] Implement spectrum falling peaks, ocean three waves and capped particles, grid8x4 transient pulses with cooldown. Reduced motion stops particles/flashes; expose readable label. Tests show different deterministic raster output for different presets, resizing bounded/reused arrays, no NaN/OOB, rates10/20/2.
- [ ] Tests assert explicit owned binary accounting <=256KiB, no frame backlog and producer remains one after live changes. Render buffers capped even huge requested dimensions.
- [ ] Run node --test; self-review; commit. Write full report with RED/GREEN evidence, APIs, measured owned buffer bytes, thresholds and concerns. Do not resolve real-host criteria.

## Task 2: CAVA source, preferences and Claude host adapter

Depends on Task1. Implements tickets02/06 and host portions01/03/05. Read host-contract.md copied into docs/integration/ before work and actual core API. If official contracts are unknown, report before using them.

Files: src/sources/cava.js; src/host/node-process.js; src/preferences.js; src/host/claude.js; hooks/register.js; hooks/hooks.json; .claude-plugin/plugin.json; test/cava.test.js; test/preferences.test.js; test/host.test.js; docs/integration/host-contract.md. Host JS may import local modules only if official contract supports this; otherwise generate a single bundled register module with a checked-in zero-dependency build script in Task3.

- [ ] RED tests on source at process/fs port boundary: one spawn, argv only, source validation rejecting INI newlines/control chars, CAVA configuration32mono20FPS raw ASCII delimiter59/10/max255, streamed parser latest frames, bounded stderr, exit handling, stop-before-spawn-resolves and tempcleanup on all paths.
- [ ] CAVA must be INCLUDED WITH PLUGIN INSTALL, clarified by the user. Use plugin-private vendored platform binaries, not a manual system prerequisite; Demo works without a release binary. Current source checkout may support explicit developer system-CAVA override but release must never require brew/apt/compiler. Implement CAVA capability checks (executable errors explained), platform explicit adapters for Linux pipewire/pulse and macOS tap. For zero-setup release, a verified bundled CAVA version may use auto only when its documented capability means default OUTPUT sink monitor; developer override requires explicit named .monitor source. Reject auto_input always; never interpret auto as generic input selection. Never auto microphone/recording backend. Config and diagnostics cap. Disposal idempotent and awaited; no handles leak in failure or race. Source port injectable; no Node APIs imported by host code.
- [ ] RED preferences tests: versioned data<=2048bytes, malformed/unknown version defaults, only preset/motion/source/layout allowlist, invalid source rejected, reset only plugin-owned storage. Persist no active capture authorization. Create async load/save/reset with injected store.
- [ ] Verified research lacks native spawn/kill/temp contracts. Build CAVA source against explicit injectable ports and implement a real Node child_process/fs port for standalone preview (this file is never imported by shipped host code). Keep native Audio action safely disabled with actionable /plugin-types message until a verified native port is provided; do not pretend process.run is streaming. This is an integration blocker, recorded in tracker, not a solved acceptance criterion. Node port uses child_process.spawn argv without shell, bounded streamed callbacks, owned temp directory/files with awaited cleanup, and stop-before-spawn race tests. CAVA CLI path may be configurable and capability checks use argv, not shell.
- [ ] Wire official host registration, command/open/start/demo/stop/setup/status/reset/preset/motion/source/expand/compact controls. Commands must not invoke model. open stopped unless already active; preserve await next(e) for AbovePrompt. One controller per session; closing expanded pane compacts, sessionend disposes. Host renders text status+Raster and valid Button controls. Native exact command namespacing and /plugin-types checks remain pending here.
- [ ] Native mocked contract harness tests user flow opening, demo, preset, expand/compact, preference handling, real-source error and Stop; assert other mod content preservation and session disposal. Avoid pretending mocks establish native validity.
- [ ] Run node --test; self-review; commit; full report with RED/GREEN and contract limitations. Do not claim real audio or native compatibility.

## Task 3: Packaging, runnable demo and review evidence

Depends on Task2. Implements ticket08 locally and prepares ticket09 as blocked release gate.

Files: README.md; scripts/build.mjs; scripts/demo.mjs; scripts/benchmark.mjs; scripts/check.mjs; test/packaging.test.js; docs/BUILD-REVIEW.md; docs/VALIDATION.md; .scratch/pulsedeck/issues/*.md. Can adjust package.json scripts and packaging paths.

- [ ] Provide zero-install build packaging plugin sources into dist/pulsedeck. If host cannot import modules, generate a single no-import register artifact with static local ESM bundle script (do not add runtime dependencies); test build artifact registration via restricted fake environment, not native SDK claim.
- [ ] Provide node scripts/demo.mjs with optional --audio using the Node CAVA port and explicit monitor/source selection, missing dependency error and no microphone fallback. Default is a deterministic demo: deterministic spectrum/ocean/grid terminal preview with no audio capture, Demo clearly labeled, maxduration/frames option and graceful CtrlC; no TTY requirement for finite mode. Explain how to run before installing.
- [ ] Provide focused core benchmark: bounds frame parser adversarial throughput and repeated-render owned bytes; output JSON labeled core-only with runtime/version. No fabricated heap/RSS/CPU/audio latency claims. User-facing perf budgets remain unmeasured targets until real machine validation.
- [ ] Implement bundled CAVA resolver and packaging gate in src/dependencies/cava-bundle.js and scripts/vendor-cava.mjs with vendor/cava/manifest.json. Manifest records pinned upstream version/commit, platform/arch, plugin-contained relative executable path, SHA256, executable permissions, capture capability, runtime library/source/license notices. Reject traversals/unsupportedplatform/checksum mismatch; no automatic PATH fallback in one-install release. Node CAVA port resolves bundled executable; source checkout can use explicit developer override. Tests use executable fixtures, never claim fixture is CAVA.
- [ ] A release build option (--release) MUST FAIL while the shipped native Audio action remains disabled, and until actual audited binaries are present and checksum-validated for declared supported targets. Valid fixture binaries alone must never permit a release with a disabled Audio action. Development preview build succeeds labeled no binaries included. Provide docs/CAVA-BUNDLING.md: CI build matrix/provenance, macOS14.2+tap arm64/x64 and Linux monitor glibc arm64/x64 targets, private libs and portability, notices/source distribution, clean machine install->Start validation. Current environment lacks CAVA/compilerdeps; do not claim crosscompiled binaries exist. Do not add bogus hashes or invent remote download URLs.
- [ ] README explicitly states CAVA ships with release plugin and no manual setup is the release requirement; explain current development preview is blocked on binaries and native APIs, and explains Claude plugin install/load instructions grounded in official docs; commands/source setup, permission/action states, no micfallback, error recovery, teardown, supported target vs validated host distinction. Development preview status prominent.
- [ ] VALIDATION records actual available binaries and nativechecks unavailable; actionable manual test checklist native /plugin-types and realcapture, stop/orphan process, stalepermission, 3presets, resizing, CAVAconfig/macos/linux, idleCPU/RSS, p95latency, retainedheap and concurrent mods.
- [ ] Update separate issue status+criteria only when demonstrated; retain ticket09 blocked and leave host-specific acceptance unchecked in tickets01/02/08. BUILD-REVIEW maps original 9tickets to changes/evidence/pendingcriteria and lists design tradeoffs. No remote repo creation or publish.
- [ ] RED packaging smoke tests, implement; npm test; npm run build; finite demo all3presets; npm run benchmark; npm run check. Self-review commit full report commands/results, remainingrisks. Root will persist final source ZIP and review artifacts.
