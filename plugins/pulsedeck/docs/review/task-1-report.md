# Task 1 implementation report

Status: DONE_WITH_CONCERNS (core/demo scope complete; source-port termination limits and real-host gates remain).
Worktree: `/workspace/scratch/20f85ddec081/pulsedeck-engine`, branch `feat/pulsedeck-engine`.
Base: `8a452a4`. Product commit: `5b83d9b6d0035cc875a138f9feabe8b85745e99e`.

## Scope and files

Added `package.json` (ES modules; `npm test` runs `node --test`), `src/core/controller.js`, `src/core/parser.js`, `src/core/raster.js`, `src/core/presets.js`, `src/sources/demo.js`, `test/core.test.js`, `test/parser.test.js`, `test/helpers.js`.
No external dependencies, network calls, telemetry, microphone fallback, host integration, issue-status completion, or real-audio claims.
Read task brief, CLAUDE.md, spec, TRD, high/low-level design, app flow and glossary. Read TDD and writing-good-tests references, systematic-debugging, verification-before-completion. No agents spawned.

## APIs

- `createController({clock, sourceFactory, invalidate, preferences?})`: `start(kind='audio')`, `stop()`, `open()`, `expand(boolean)`, `setPreset()`, `setMotion()`, `setSource(config)`, `snapshot()`, `render(width,height)`, `dispose()`.
- Snapshot states: Stopped, Checking, Waiting, Active, Silence, Error; source kinds: None, Audio, Demo. All views have a readable source/state/preset/message label. Demo is labeled throughout.
- Preferences here are an optional plain initial object with `preset`, `expanded`, `motion`, `source`; persistence/validation is a later adapter task. Every construction remains Stopped.
- Source callbacks accept reusable Uint8Array(32); controller copies immediately into its normalized latest slot. Invalid frame types/lengths are ignored. No retained source-frame references or frame queue.
- One serialized source lifetime; generations immediately retire callbacks on Stop, replacement, error and disposal. Pending late handles are stopped before subsequent startup. Repeated Start is idempotent. Source configuration change stops and requires a new explicit Start.
- `createParser(onFrame)`: `push(string|Uint8Array)`, `reset()`, `metrics()`. Fixed byte-wise line storage, reusable latest Uint8Array(32), two-pass validation prevents an invalid frame from corrupting its last valid slot. Accepts CRLF and one trailing semicolon, exactly 32 integers 0–255. Invalid and oversized input drops through newline and recovers. No input chunk is retained.
- `createDemoSource(clock)`: `start(kind,config,callbacks)`, `dispose()`, `metrics()`. Deterministic 20 Hz synthetic bands with one cancellable producer and a reusable 32-byte frame. It rejects real-audio requests with setup guidance rather than silently using Demo.
- Helpers export `createRaster()`, `MAX_WIDTH=128`, `MAX_HEIGHT=48`, `createPresets()`, and controller `LIMITS`.

## Thresholds and ownership

Mean normalized band energy <=0.02 for >=1500 ms of valid quiet frames enters Silence; audible frames recover Active immediately. Missing frames show Waiting at >=2000 ms and Error at >=10000 ms, with monitor/CAVA setup actions. Error retires the generation, cancels drawing and queues producer cleanup; retries are explicit.

Drawing: compact 100 ms / 10 Hz, expanded 50 ms / 20 Hz, Silence or reduced motion 500 ms / 2 Hz. Changes cancel the prior schedule before installing a replacement. Repeated audio frames update the latest slot without bypassing the redraw schedule; transitions/control actions invalidate immediately. Animation elapsed is clamped to 250 ms. Smoothing rate 12/s; falling peaks 0.45 normalized amplitude/s.

Ocean: three waves, 48 reusable particle slots; moving particles disabled under reduced motion. Grid: 8x4 cells, transient rise >0.08 above exponential baseline, energy >0.12, 250 ms cooldown, cell decay 4/s, baseline 3/s. Reduced motion clears pulse state and uses restrained continuous cell brightness. Preset/layout changes retain the producer.

Owned retained binary arrays (actual byteLength):

| Allocation | Bytes |
|---|---:|
| Three Float32Array(32): normalized, smoothed, peaks | 384 |
| Two Uint8Array(128*48*4) raster buffers | 49152 |
| Float32Array(48*4) particle records | 768 |
| Float32Array(32) grid cells | 128 |
| Controller/preset/raster total | **50432** |
| Demo reusable Uint8Array(32) | 32 |
| Controller with Demo | **50464** |
| Parser pending Uint8Array(4096) + latest Uint8Array(32) | **4128** |
| Controller + parser, excluding adapter-specific resources | **54560** |

All are below 262144 bytes. Raster views share these buffers; dimensions clamp before sizing views, including huge, negative and nonfinite requests. Two buffers alternate on draw ticks and are reused. Views are borrowed: callers must not retain them beyond subsequent draw ticks, and repeated renders in the same tick redraw the current buffer. No palette binary allocation; colors are calculated while drawing. Source factories may report their retained binary bytes via optional `metrics().ownedBinaryBytes`, which snapshot accounting includes. Heap, strings, UI objects, OS/helper allocations and RSS are separate and unmeasured. Error messages cap at 400 UTF-16 units plus guidance, below 2 KiB even for non-ASCII content.

## RED / GREEN evidence

1. Before implementation: `npm test`, exit 1. 15 discovered tests: pass 1 helper module, fail 14. Controller/parser/demo tests failed with AssertionError `actual 'undefined', expected 'function'` because requested exports did not exist. Initial dynamic-import fallback made absent-module failure a visible feature assertion; final tests use static imports so syntax/load faults remain explicit.
2. Initial production implementation: `node --test`, exit 1, 14 pass / 1 fail. The async-start test accessed callbacks before its fixture had actually entered the source. Root cause: the queued operation awaits release, so one microtask was insufficient. Changed fixture to wait for the explicit callbacks condition. `node --test`: exit 0, 15/15.
3. Removed falling peak decay and grid cooldown while adding independent behavioral assertions. `node --test`: exit 1, 15 pass / 2 fail: falling peak row did not move (`low>high` false); rapid second grid transient produced `2 !== 1`. Implemented decay/cooldown: `node --test`, exit 0, 17/17.
4. Added supporting independent fixtures for latest-frame equivalence, exact binary accounting, three ocean layers/capped particles, deterministic demo and direct disposal; `node --test`, exit 0, 20/20.
5. Added compact redraw-ingestion regression. `node --test`: exit 1, 20 pass / 1 fail, `103 !== 3` invalidations before the next tick. Suppressed repeated identical state notifications: `node --test`, exit 0, 21/21.
6. Added double-buffer lifetime/reuse regression before adding the second raster allocation. `node --test`: exit 1, 21 pass / 1 fail: both returned views had the same ArrayBuffer. Added tick-switched capped buffers and updated actual accounting: `node --test`, exit 0, 22/22.
7. Final fresh full suite after readable-controller refactor/static imports: `node --test`, exit 0, tests 22, pass 22, fail 0, cancelled 0, skipped 0, todo 0; duration 278.571933 ms. This includes helpers.js as Node's discovered test file (21 explicit behavior tests).
8. `git diff --cached --check`: exit 0, no output. Node version: v24.19.0. Initial npm invocation printed an environment warning about an unknown `http-proxy` configuration; direct Node suite has no warnings.

## Self-review and limitations

Checked callback generations across pending setup/Stop, repeated Start, errors/end, source replacement and explicit Retry; one source and one renderer schedule survive live visual changes. Error/end tests assert cleanup without calling Stop first. Parser tests cover split/coalesced chunks, every-byte splits, bad count/syntax/ranges, CRLF/trailing separator, megabyte overflow recovery and capped pending memory. Raster tests cover distinct preset output, numeric dimensions, reuse, latest-frame equivalence, falling peaks, capped particles, reduced motion and cooldown.

Known port limitation: `sourceFactory.start()` and `handle.stop()` have no cancellation/timeout contract. If an adapter never settles startup or Stop, the controller retires UI callbacks/timers immediately but cannot force an unknown resource to terminate or complete its cleanup promise. A returned late handle is cleaned; termination within one second requires the later real adapter/host evidence. The Error timer does not invent permission diagnoses or auto-restart.

Real CAVA, host UI, capture latency/CPU/RSS/heap, long-running memory, native cleanup budgets and platform compatibility remain unverified and are not marked complete. Preference persistence/source validation and host unload wiring are later tasks. The initial primitive-export RED guard established absence, and supporting fixtures were strengthened after first GREEN; the report does not claim every strengthening had an independent preimplementation failure.

## Task 1 review fixes

Fix commit: `7cf4ec4a9d9ed49ecca1033b3f28c51a123bd834` (after initial `5b83d9b6d0035cc875a138f9feabe8b85745e99e`). Read the full Task1 review and receiving-code-review skill before implementing. No delegation or scope expansion.

Verified both important findings in executable RED regressions. Controller now retains a handle until its Stop promise fulfills. Rejection leaves a cleanup barrier and Error guidance: choose Stop to retry cleanup before Start. Start cannot silently retry failed termination or create another producer. This applies to explicit Stop, automatic error/end cleanup and late retired startup handles. Successful explicit Stop clears the retained handle/barrier and permits another Start. A never-settling termination still blocks replacement safely; its host timeout capability remains the original port limitation.

Cleanup failures are modeled as current owned-resource failures rather than asynchronous retired capture messages. A later explicit Stop retry success restores stopped guidance, while a failure remains actionable Error. Generation-aware successful Stop completion does not overwrite a newer command. The stale asynchronous error-message catch was removed.

Demo replaces/cancels its owned timer synchronously, with no await between cancellation and startup ownership. Concurrent direct starts therefore cannot install overlapping timers; disposal cancels the sole owned producer, and stopped/disposed callbacks are ignored. Old returned handles cannot cancel a newer producer. Touched Demo lifecycle code and new regressions use readable blocks.

Public controller render JSDoc and raster resize JSDoc clarify the borrowed-buffer contract: **any subsequent render may overwrite storage immediately, including repeated same-tick render, resize or control changes**. Stable consumers must copy. This supersedes the earlier report's looser wording about retaining until subsequent ticks.

RED/GREEN evidence:

- Before fixes: `node --test test/lifecycle.test.js`, exit 1, 6 tests / 0 pass / 6 fail. Failures: Stopped instead of cleanup Error; generic cleanup text without Stop retry guidance; retired startup returned Stopped despite live producer; retired cleanup clobbered stopped state; concurrent Demo retained `[50,50]` schedules rather than `[50]`; start/dispose overlap retained `[50]` rather than `[]`.
- After first fixes: focused suite exit 0, 6/6; full `node --test` exit 0, 28/28.
- Added overlap-success regression before its correction: focused suite exit 1, 6 pass / 1 fail, `Error !== Stopped` after a newer explicit Stop successfully retried cleanup. Restored only the current Stop generation's successful stopped guidance.
- Final fresh focused suite: `node --test test/lifecycle.test.js`, exit 0, 7/7, 120.591146 ms.
- Final fresh full suite: `node --test`, exit 0, tests 29, pass 29, fail 0, cancelled 0, skipped 0, todo 0; 211.455292 ms. One discovered helper file means 28 explicit behavioral cases.
- `git diff --check` and `git diff --cached --check`: exit 0, no output. Commit completed; worktree status clean.

Binary allocations/thresholds are unchanged: core 50432 bytes, Demo 50464, parser 4128. Native-host/capture, actual termination budget and performance gates remain pending, as scoped. Both Important review defects and related stale-guidance/lifetime documentation issues are addressed.

## Task 1 review fix round 2

Commit: `414b3bf2510dfe7a2bf7b1a3537fb70300a4299f`. Read `task-1-rereview.md` and reproduced its new Important queued Stop/Start regression before fixing it.

The current queued startup now re-establishes Checking/source labeling, its missing-frame timestamp and drawing schedule **after** successful prior cleanup and generation/disposal validation, before calling the source factory. A prior automatic-cleanup rejection can no longer strand the replacement producer in Error after an explicit Stop retry succeeds. The failed-cleanup ownership barrier and requirement for explicit Stop retry remain intact.

Added a readable regression that holds automatic cleanup pending, queues Stop and Start, rejects the original cleanup, allows the explicit Stop retry to succeed, and asserts one replacement producer, maximum live producer count one, Waiting/Audio labeling, a single 100 ms schedule, no stale cleanup guidance, and the replacement's 10-second missing-frame Error/cleanup behavior.

- RED: `node --test test/lifecycle.test.js`, exit 1: 8 cases, 7 pass, 1 fail. Exact failure: `Error !== Waiting` for the live queued replacement.
- GREEN focused: same command, exit 0: 8/8, 135.744424 ms.
- GREEN full: `node --test`, exit 0: tests 30, pass 30, fail 0, cancelled 0, skipped 0, todo 0; 224.27515 ms. Includes one discovered helper module, so 29 explicit behavioral cases.
- `git diff --check` and staged equivalent: exit 0, no output. Commit completed, worktree status clean.

No binary allocations, thresholds, external dependencies or host scope changed. Native cleanup timing/performance remains unverified as previously scoped. No agents spawned.
