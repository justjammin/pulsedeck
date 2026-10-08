# PulseDeck sources and validation plan

## Sources read

Sources were read on 7 October 2026. Framework descriptions below are attributed to their original publishers. PulseDeck requirements, budgets, module choices, and tickets are our proposed application of those sources.

| ID | Source | Design use |
| --- | --- | --- |
| S01 | Claude Mods overview | Local mod hooks and UI integration |
| S02 | Claude Mods reference | Terminal graphics, host version, redraw limits |
| S03 | Claude Mods API | Streaming process boundary and restricted hook runtime |
| S04 | CAVA README | Capture backends and platform constraints |
| S05 | CAVA example configuration | ASCII transport options and source settings |
| S06 | Hello Interview delivery framework | High-level design section order |
| S07 | Refactoring Guru Strategy | Interchangeable visual algorithms |
| S08 | Refactoring Guru Adapter | Host and audio integration boundaries |
| S09 | Refactoring Guru State | Explicit lifecycle transitions |
| S10 | Matt Pocock to-spec | Spec synthesis and proposed behavioral test seam |
| S11 | Matt Pocock to-tickets | Vertical slices, blockers, and review before publication |
| S12 | Matt Pocock setup | Local tracker and agent configuration proposal |

## Source URLs

- S01 https://code.claude.com/docs/en/plugins/mods/overview
- S02 https://code.claude.com/docs/en/plugins/mods/reference
- S03 https://code.claude.com/docs/en/plugins/mods/api
- S04 https://github.com/karlstav/cava
- S05 https://github.com/karlstav/cava/blob/master/example_files/config
- S06 https://www.hellointerview.com/learn/system-design/in-a-hurry/delivery
- S07 https://refactoring.guru/design-patterns/strategy
- S08 https://refactoring.guru/design-patterns/adapter
- S09 https://refactoring.guru/design-patterns/state
- S10 https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md
- S11 https://github.com/mattpocock/skills/blob/main/skills/engineering/to-tickets/SKILL.md
- S12 https://github.com/mattpocock/skills/blob/main/skills/engineering/setup-matt-pocock-skills/SKILL.md

The read to-spec blob SHA is 3f52599ae2a4347aee5a07432c2707518e691a7f. The read to-tickets blob SHA is 9b77a01db9460c99c22d03c910c349f890f12c0e. The read CAVA configuration blob SHA is 0afd1d6076167a336d6fe365e5d5809a5af86ef0. These identify the content consulted, not a decision to pin the eventual shipped dependency to an unvalidated commit.

## Automated verification planned

Exercise controller journeys with a fake clock and source; validate all accepted and malformed frame forms; test chunk splitting and bounded resynchronization; assert maximum retained buffers and bounded latest-frame behavior; verify one resource owner across races and source changes; validate preferences and source injection rejection; check preset outputs at narrow and maximum dimensions; and inspect the package manifest and installed entry points.

## Manual compatibility protocol

Record OS, hardware, Claude version, CAVA version and build capabilities, selected backend, terminal, and viewport. Export generated host types, typecheck the adapter, run native plugin validation, load with a plugin directory, and confirm controls while Claude is working. Play a known local signal, verify that Demo is absent, then pause and resume audio. Switch all presets and layouts, repeat Start/Stop twenty times, change source, force a helper exit, and end the session. Verify that owned processes and timers are gone.

## Benchmark protocol

Warm the host for one minute without PulseDeck capture and record baseline RSS and CPU. Enable capture in each preset and layout for ten minutes. Sample host and CAVA memory separately; report their sum minus the host baseline as a noisy incremental estimate. Describe sampling intervals and GC behavior. For latency, use a timestamped test signal and a screen recording or instrumented render timestamp; report p50 and p95. Keep measurements local and opt-in. A source-adapter benchmark alone does not measure host rendering overhead.

## Current evidence

This package contains the approved design, published local specification and tickets, product code, runnable synthetic demos, controller/parser/process/preferences/host-mock tests, packaging checks, and a core-only buffer benchmark. The authoring environment has no native Claude Code or real CAVA executable and no audio device. Native loading/capture, total RSS/CPU/heap/latency and marketplace validation have not been demonstrated. See docs/BUILD-REVIEW.md and docs/VALIDATION.md for actual evidence; ticket09 and one-install release acceptance remain unresolved.
