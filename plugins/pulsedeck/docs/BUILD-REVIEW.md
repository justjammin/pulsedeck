# Build review

Development preview complete at local core, Node and mocked host boundaries. Native capture and one-install CAVA release remain blocked. Source license is pending owner review; this package does not assert redistribution readiness.

| Original ticket | Implemented/evidence | Pending acceptance |
|---|---|---|
| 01 Labeled demo | Controller/demo and mock control flow; finite three-preset previews | Actual native loading/command namespacing |
| 02 Real system audio | Output-only config/parser, capability checks, argv Node source tests | Actual CAVA frames, native binding, output permissions |
| 03 Reliable stop | Generation/ownership retry tests, awaited Node child/config cleanup | Host shutdown/orphan semantics |
| 04 Three presets | Core distinct frames, smoothing/peaks, bounded ocean/grid effects; same producer | Live native switching and visible guidance |
| 05 Layout/resize | Capped two buffers, schedule bounds, mock compose/pane close and Desktop text | Native resize/focus/render accessibility |
| 06 Settings/motion | Versioned bounded preference validation; stopped restore/reset; reduced-motion tests | Actual host store/render acceptance |
| 07 Bounded resources | Parser adversarial recovery, no queue, bounded arrays/diagnostics; core benchmark | Host JS retained heap/RSS/CPU during long capture |
| 08 Package/setup | No-dependency static one-file host bundle; restricted registration test; resolver/gates; README | Native types/smoke, source-license decision, audited bundled payloads/clean install |
| 09 Release budgets | Honest manual checklist and unmeasured target labels | All actual machine capture/performance evidence; blocked |

## Review tradeoffs

- Host artifact statically rewrites only known local named ESM imports/exports into isolated module factories. No generic bundler dependency or runtime import is needed. Unsupported syntax/external imports reject. The mock checks module registration with Node globals/timers unavailable, rather than claiming a native SDK check.
- Node resolver is packaging/developer-only. Realpath containment, checksums, executable permissions, support material and explicit capabilities are required; no PATH fallback. Empty vendor manifest permits labeled preview. No fake binary/hash/download URL is in the shipment.
- Native Audio remains unavailable because public host sources omit exact stream/kill/temp contracts. A valid fixture or even real CAVA cannot independently unlock release. CI/provenance and installed target types are required together.
- Parser consumes chunks directly into bounded 4096-byte state; controller borrows two RGBA buffers and must be consumed synchronously. Native base64/text allocations and host/helper memory are outside core owned arrays.
- Finite preview follows deterministic synthetic time; optional Node audio follows paced real time and requires explicit capability/source attestations for developer overrides. Startup failure still runs all cleanup attempts. Cleanup errors report failure rather than disguising ownership loss.
- Benchmarks measure parser elapsed throughput and repeated-render owned arrays on this Node runtime. Configured 10/20/2 FPS are schedules, not measured host rendering rates; CPU/RSS/latency budget targets remain unmeasured.

Tests and exact RED/GREEN/build/check evidence: `docs/review/task-3-report.md`. Native/source research: `docs/integration/host-contract.md` and `CAVA-BUILD-INPUTS.md`. No remote repository or publication was created.
