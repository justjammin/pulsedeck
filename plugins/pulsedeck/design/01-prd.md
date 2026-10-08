# PulseDeck product requirements

## Product decision

Build a music-reactive visualizer inside Claude Code's terminal interface. Users can watch the music they already play, switch between three visual styles, and keep coding without a separate visualizer window. The first release should make the small, always-available view feel useful and make the expanded view worth opening.

The intended audience is developers and music creators using Claude Code locally. The owner needs a buildable scope and evidence for the low-memory positioning. This document defines product behavior; technical decisions and implementation tickets are linked in the accompanying documents.

## Problem and opportunity

Coding sessions have an interface that can accommodate ambient visuals, but a visualizer should not interfere with the conversation, require music-service credentials, or consume resources without a clear limit. PulseDeck provides an audio-reactive experience through an installed mod, using local capture and bounded state. The product hypothesis is that users will keep a compact spectrum visible and occasionally expand richer presets during long sessions. This is a hypothesis to validate with users, not an established adoption claim.

## Outcomes

1. A user sees visuals driven by actual audio from a selected local source.
2. A user controls capture, layout, and preset while Claude continues working.
3. A user understands silence, missing dependencies, and capture failures without confusing them with active audio.

## First release scope

| ID | Priority | Requirement | Acceptance outcome |
| --- | --- | --- | --- |
| P01 | Must | Open PulseDeck with /pulsedeck | Opens controls in a stopped state on first use |
| P02 | Must | Explicitly start and stop capture | Start creates one source; Stop releases it |
| P03 | Must | Visualize system-output audio | Spectrum follows the selected source, not Claude tool events |
| P04 | Must | Show Pocket Spectrum | Bars and peak markers respond to frequency bands |
| P05 | Must | Show Astral Ocean | Waves and a bounded star field respond to bass and mids |
| P06 | Must | Show Breakbeat Grid | A fixed grid pulses on low-band energy transients |
| P07 | Must | Switch presets while active | No capture restart, duplicate process, or stream backlog |
| P08 | Must | Compact and expanded layouts | Both remain legible within available terminal space |
| P09 | Must | Handle silence and unavailable audio | Status distinguishes silence, waiting, and capture failure |
| P10 | Must | Recover from source failures | Clear diagnostic and a user-triggered retry |
| P11 | Must | Support a labeled demo mode | Works without audio; always displays Demo |
| P12 | Must | Respect reduced motion | Disables flashes and particles and lowers render rate |
| P13 | Must | Persist safe preferences | Remembers preset and motion settings, not active capture |
| P14 | Must | Fit a bounded resource model | Reports configured limits; performance claims use measurements |
| P15 | Must | Clean up on stop and unload | No orphan capture process or continuing render timer |
| P16 | Must | Provide setup guidance | Names the needed capture backend and compatibility limits |
| P17 | Should | Select a capture device | Explicit validated device/source setting; no hidden mic fallback |
| P18 | Should | Reset preferences | Returns to conservative defaults without touching other plugins |

P01-P16 form the release gate. P17-P18 are included in the proposed backlog but may be deferred without losing the core visualizer.

## Visual direction

Use a dark navy background with cyan, lavender, and warm amber accents. Compact mode prioritizes clear bars and a short state label. Expanded mode adds spatial detail without reproducing a full music player. Preserve readability when the terminal supports fewer colors or has a narrow viewport.

| Preset | Audio response | Visual limit |
| --- | --- | --- |
| Pocket Spectrum | Thirty-two bands, smoothing, falling peaks | Thirty-two bars and thirty-two peak markers |
| Astral Ocean | Bass moves wave height; mids alter ripples | Three wave layers and at most forty-eight stars |
| Breakbeat Grid | Energy transients illuminate cells | Eight by four grid; no claim of exact beat tracking |

## Primary user journey

The user installs the plugin, runs /pulsedeck, and sees the current preset plus Start, Demo, and Setup controls. Start checks the capture configuration and begins the selected source. The compact band shows a live spectrum and status. Expand opens a larger pane. A preset change updates the drawing immediately. Stop releases capture and returns to the stopped screen. Opening a pane never takes focus unless requested through an explicit interaction.

## Accessibility and trust

Display text status alongside color. Reduced motion removes star movement and percussive flashes. Avoid strobe effects, rapid full-screen changes, and reliance on a blinking state indicator. Capture is opt-in, microphone use is explicit, and frames remain local. PulseDeck stores neither recordings nor transcripts and sends no telemetry or audio to a service.

## Out of scope

Music playback controls, Spotify or Apple Music authentication, track metadata, playlists, BPM accuracy, recording, video export, cloud synchronization, custom shader uploads, a browser companion, arbitrary plugins, and automatic model-generated visual styles. LoopBrake is a separate idea and is excluded from PulseDeck.

## Success measures and validation

Run an initial usability session with at least five local Claude Code users. The proposed targets are four of five starting their first supported source in under three minutes after dependencies are installed, all users locating Stop without assistance, and no user mistaking Demo for real capture. Collect feedback manually; do not add runtime analytics.

Release requires the core acceptance criteria, a ten-minute stability run, repeated start/stop checks, and at least one real-audio validation on each advertised operating system. Capture-to-display latency and whole-process overhead are engineering targets, not promises until measured.

## Accepted workflow and release decisions

The approved scope is terminal first, with macOS and Linux release validation, controller-to-view behavioral tests, nine local Markdown tickets, and CLAUDE.md project guidance. Engineering implements and reviews the preview in three batches. Public marketplace release and actual native compatibility remain pending release work.


## Approved scope update: one plugin install includes CAVA
The user clarified that PulseDeck must provide CAVA as part of plugin installation, with no separate Homebrew, apt, compiler, or configuration step on supported platforms. The release artifact must include a tested platform-specific CAVA executable and required private runtime libraries, with pinned provenance and notices. Default output-monitor selection is automatic only for a verified bundled build. OS audio permission prompts may remain necessary; no microphone fallback is allowed.

The current development preview may lack these payloads and must say so. Release packaging must fail when audited payloads are missing. Clean-machine install -> open -> Start is a release acceptance test. Claude skips normal package lifecycle scripts, so postinstall is not the dependency delivery mechanism. Native streaming integration remains separately gated on verified host contracts.
