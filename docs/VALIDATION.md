# Validation evidence — Apple Silicon candidate

Environment: macOS 26.3.2, arm64, Claude Code 2.1.293, Node.js v25.9.0. The accepted first-release target is Apple Silicon macOS 14.2+. GPL-3.0-or-later source distribution was selected by the owner.

| Check | Observed result |
| --- | --- |
| Source tests | 66 pass in the final check; parser, controller, ownership, preferences, process adapter, permission diagnostics and packaging |
| Native mod tests | 2 pass: terminal controls/rendering/Stop/coexistence, Desktop fallback and survey preservation |
| Native plugin validation | Packaged candidate passes with no manifest warnings |
| Real terminal Demo | `/pulsedeck demo` reaches Active and renders changing Raster cells inside Claude Code |
| Native streaming termination | Real host probe reads a marker, leaves a second read pending, then terminates the quiet child within one second; no audio permission involved |
| Actual system-output capture | Start launches bundled CAVA; CoreAudio refuses with `AudioTap permissions missing`. Successful audio capture is not verified |
| Candidate runtime | CAVA 1.0.0 pinned commit, static FFTW 3.3.11/iniparser 4.3.2; only macOS system dynamic libraries |
| Binary baseline and signature | Mach-O minimum macOS 14.2; arm64; ad-hoc signature verifies |
| Release checks | Reject pending native acceptance and unaudited manifest |
| Clean-install audio | Pending; a candidate archive is available for testing |
| Whole-host resource budgets | Unmeasured; 40 MiB incremental RSS, 5% of one core, 200 ms p95 remain targets |
| Ten-minute real-audio run and twenty capture cycles | Pending system audio permission |
| Publication | No public repository or production tag created; the approved release requires native acceptance first |

The Mac was locked when System Settings inspection was attempted. Enabling system audio recording for the host app and unlocking the Mac are needed before successful real-capture, latency/resource measurements and clean-install testing can continue. Claude sign-in is not required for native command/rendering tests; no model calls were used.

Build logs and loader/toolchain evidence are in `vendor/cava/provenance`. The installed declarations are archived in `docs/integration/claude-code-2.1.293.d.ts`; they define process streaming and child cancellation, superseding earlier public-type research. `docs/review/native-stream-probe.js` is the actual isolated host probe, not part of the shipped hooks.

The candidate adapter is implemented, but `nativeAudioReady` remains false and the target remains unaudited until the missing acceptance evidence exists. Setting flags is not a substitute for those checks.
