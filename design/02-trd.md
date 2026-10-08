# PulseDeck technical requirements

## Technical decision

Use a JavaScript or TypeScript Claude Mod with a small audio-source adapter. CAVA performs capture and spectral analysis in one child process. The mod parses a bounded ASCII stream, retains the latest frame, updates bounded visual state, and renders terminal elements. There is no application server, browser runtime, model call, database, or audio recording.

Claude's public documentation describes mod UI, streaming subprocess access, and redraw throttling. Exact generated host types and subprocess cleanup semantics must be verified in the target Claude version before an installable build is declared compatible. [Sources S01-S03]

## Platform and runtime contract

| Area | Proposed contract | Validation needed |
| --- | --- | --- |
| Host | Claude Code CLI 2.1.290 or later | Match generated plugin types and validate plugin |
| macOS | 14.2 or later; Core Audio tap-capable CAVA | Verify actual CAVA build, permission behavior, and loopback |
| Linux | PipeWire or PulseAudio monitor capture | Verify source routing and raw stdout output |
| Windows | Deferred compatibility target | Verify native paths, process ownership, capture, and UI |
| Desktop | Deferred UI target | Raster is terminal-only; select a supported drawing adapter |
| Build tooling | Current supported Node LTS and TypeScript | Pin versions and lockfile when implementation starts |
| Runtime dependencies | CAVA executable; built-in mod APIs | No npm packages required by the shipped core |

Existing CAVA builds may require a loopback device on macOS. The UI must explain the observed configuration; it must not promise that every Homebrew build has tap support. No dependency is downloaded or installed automatically. [S04-S05]

## Functional system requirements

| ID | Requirement | Verification |
| --- | --- | --- |
| T01 | One capture source per PulseDeck instance | Repeated Start yields one owned process |
| T02 | Latest frame wins | Slow rendering never grows an audio-frame queue |
| T03 | Bounded stream parser | Oversized or malformed input cannot grow retained memory |
| T04 | Explicit state transitions | Stop, error, demo, and real capture cannot overlap |
| T05 | Bounded render dimensions | Resize cannot allocate beyond the supported pixel budget |
| T06 | Presets share one spectrum | Switching presets preserves the active source |
| T07 | Safe source configuration | Values are validated; process arguments never enter a shell |
| T08 | Bounded diagnostics | Error details retain only a short sanitized stderr tail |
| T09 | Minimal persistence | Save preferences under a versioned, plugin-owned key |
| T10 | Explicit cleanup ownership | Timers and processes are disposed on Stop and session end |
| T11 | Composable host UI | Preserve other mods' above-prompt content via the hook chain |
| T12 | Visible source provenance | Every view identifies Audio, Demo, Silence, or Error |

## Audio transport

Configure CAVA for thirty-two mono bars, twenty frames per second, raw ASCII output, a maximum value of 255, semicolon-separated bars, and newline-separated frames. Allow one terminal semicolon. A valid frame contains exactly thirty-two integer values in the inclusive range 0-255. Normalize each value to 0-1 after parsing. CAVA's current configuration source supports these options. [S05]

At most 129 ASCII bytes represent a frame if all thirty-two values have three digits and each bar has a separator, plus a newline. At twenty frames per second this is about 2.6 KB per second. This calculation determines parser sizing rather than a networking requirement.

Keep at most 4 KiB of unconsumed input and 2 KiB of diagnostic text. Discard malformed or oversized frames, resynchronize at the next newline, and report a bounded error count. A callback may include several frames; consume them and retain only the newest complete valid frame. Never persist stdout, stderr, PCM, or spectra.

## Resource and responsiveness targets

| ID | Target | Boundary |
| --- | --- | --- |
| N01 | No more than 256 KiB of owned retained binary buffers | Excludes host UI trees and CAVA allocations |
| N02 | Target mod-attributable retained heap below 256 KiB after warmup | Measure separately; object overhead is not buffer capacity |
| N03 | Target total incremental RSS at or below 40 MiB | Host delta plus CAVA; benchmark-dependent release target |
| N04 | Ten FPS compact and twenty FPS expanded | Host's actual redraw limit remains authoritative |
| N05 | Two FPS in silence and reduced-motion mode | Audio capture can remain active to detect resumption |
| N06 | Capture-to-visible latency below 200 ms at p95 | Measure with a known local audio signal |
| N07 | Typical combined CPU target at or below five percent of one core | Specify hardware, preset, dimensions, and sample interval |
| N08 | No steady-state linear memory growth over ten minutes | Report warmup and GC noise; investigate sustained growth |
| N09 | Stop releases owned resources within one second | Fit Claude's session-end budget; verify host termination API |

All numeric performance values are proposed targets. A missed target requires optimization or an explicit documented scope adjustment, never relabeling an unmeasured value as a result. Claude documents ten redraws per second generally and up to thirty for a visible terminal pane or expanded band. [S02]

## Buffer budget

| Allocation | Maximum |
| --- | --- |
| Input, smoothed, and peak spectrum arrays | 384 bytes at thirty-two bands |
| Two 128 by 48 RGBA render buffers | 49,152 bytes |
| Palette lookup | 1,024 bytes |
| Forty-eight bounded particle records | 1,536 bytes |
| Pending input and diagnostic capacities | 6,144 bytes |
| Scratch and counters allowance | 6,144 bytes |
| Planned binary capacity | 64,384 bytes |

JavaScript strings, UI element objects, settings, and the source helper are measured separately. A small array payload does not imply a small process RSS.

## Error and concurrency rules

Starting twice is idempotent. A source change completes shutdown before creating a replacement. Generation identifiers invalidate late callbacks from older sources. Stop is idempotent and never terminates an unrelated process. Unexpected exit moves the controller to Error; Retry is a user action. Missing frames with a still-alive process show Waiting or Silence according to the last valid signal, rather than inventing a permission diagnosis.

UI updates cannot wait for capture readiness. Clear error messages expose actions such as checking CAVA, selecting a supported monitor source, or granting an observed OS permission. Cap retry attempts within a single explicit action and do not auto-restart indefinitely.

## Data and security requirements

Persist only schema version, preset, preferred layout, motion setting, and validated source configuration in the plugin store. Keep saved preference payloads below 2 KiB. Never persist auto-start authorization. Ignore unknown fields and repair invalid values to conservative defaults. Device names must reject newlines and configuration section delimiters. Construct CAVA arguments as an argument array, use a plugin-owned temporary configuration, and remove it during cleanup.

## Test seam and release gates

The proposed highest seam is the PulseDeck controller's command-to-view behavior, driven by a fake source and clock. That seam verifies source ownership, ingestion, settings, and visible state together. Property-style chunk tests separately exercise malformed transport because unbounded parsing is a specific risk. Native-host integration and real capture remain separate manual release gates; mocked contracts cannot replace them.


## Approved scope update: one plugin install includes CAVA
The user clarified that PulseDeck must provide CAVA as part of plugin installation, with no separate Homebrew, apt, compiler, or configuration step on supported platforms. The release artifact must include a tested platform-specific CAVA executable and required private runtime libraries, with pinned provenance and notices. Default output-monitor selection is automatic only for a verified bundled build. OS audio permission prompts may remain necessary; no microphone fallback is allowed.

The current development preview may lack these payloads and must say so. Release packaging must fail when audited payloads are missing. Clean-machine install -> open -> Start is a release acceptance test. Claude skips normal package lifecycle scripts, so postinstall is not the dependency delivery mechanism. Native streaming integration remains separately gated on verified host contracts.
