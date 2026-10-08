# PulseDeck final branch review

Reviewed scope: `f89be2c..78538c0`, development preview, against the canonical specification, implementation plan, BUILD-REVIEW and prior review rulings. Read-only product review; no full-suite rerun.

**Verdict: changes requested for one Important ownership defect.** No Critical findings. The one-install CAVA requirement remains unsatisfied and explicitly release-blocked; that honest limitation is not a new preview defect.

## Important

**Retain failed version-probe cleanup ownership — `src/host/node-process.js:28-33`, with `:19-20`.**

`check()` owns the `cava -v` child only in a local variable. When a hung probe reaches its two-second timeout and `handle.stop()` rejects because termination is unconfirmed, the rejection escapes and the only accessible cleanup handle is lost. `retryCleanup()` tracks directories only, while a subsequent `check()` freely spawns another probe. The CAVA source cannot repair this: it has not yet received its capture child/configuration, and the check error carries no cleanup owner. Thus the developer CLI's otherwise thorough final cleanup cannot retry this child.

Focused reproduction replaced the injectable `port.spawn` with a never-exiting probe whose `stop()` rejects. Two sequential `check()` attempts each timed out; afterward the fake OS had **2 live probes, 2 spawns, 2 stop calls, and pendingCleanupCount() = 0**. Calling `retryCleanup()` made no additional stop attempt. No real audio or native host claim is involved.

Retain pending probe handles at the port boundary, block successor probes/capture allocation while termination is unresolved, and include them in explicit shared/retryable cleanup. Also ensure a handle resolving after the probe timeout is adopted and stopped rather than orphaned. Add a focused timeout/failed-stop/retry regression at the check-to-source boundary. This is the same ownership invariant already correctly enforced for capture children and failed configuration cleanup.

## Critical / Minor

No Critical findings. No additional Minor findings requiring this build to change. Compressed formatting in some source/tests remains a maintenance consideration already recorded by earlier review.

## Cross-boundary assessment

- Controller generation guards, serialized replacement and retained rejected capture cleanup are coherent; previous queued restart fixes are present.
- Parser pending/frame storage and counters remain bounded. Host packing consumes borrowed raster pixels synchronously; native transport allocations are correctly excluded from core retained-array claims.
- Retired UI callbacks and suspended downstream rendering carry lifecycle checks. Preferences allowlist storage and reset remain scoped to the plugin; real host acceptance is still pending.
- The current host module graph has no Node runtime imports, external JavaScript dependencies, network/model calls, or microphone fallback. Static packaging and executable checksums/path confinement/capability declarations are implemented; audited metadata is not misrepresented as proof of authentic CAVA.
- README, ticket statuses and validation documents prominently distinguish the development preview from native/one-install release acceptance. The empty payload manifest and disabled native Audio flag fail release closed.

## Evidence and remaining gates

Root independently reported 58 passing tests, successful build and three finite Demo presets, constant 50,432 core typed-array bytes, and expected release exit 1. Those commands were not rerun during this broad review. Only the concrete probe cleanup doubt above received a focused reproduction.

Remaining release gates: actual audited CAVA/private-library payloads and provenance/notices for declared targets; verified native streaming/kill/temp contracts and generated host types; native command/UI/store/teardown acceptance; clean-machine install → Start capture without manual dependency configuration; real output-only capture and orphan checks; measured CPU, RSS, retained heap and p95 latency. There are **zero actual bundled binaries** and native Audio is disabled. Resource targets remain unmeasured, not achieved budgets.
