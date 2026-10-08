### Spec Compliance

- ✅ Scoped fix diff addresses all four original Important findings. No new blocking issue found.
- ⚠️ Native streaming ABI, installed host behavior, actual audio capture, and bundled release binaries remain the previously acknowledged integration/release gates; this approval does not establish them (`docs/integration/host-contract.md:307-316`).

### Strengths / Verified Fixes

- Concurrent source teardown shares one per-owner in-flight promise; rejected cleanup clears only that promise and retains resource ownership for retry (`src/sources/cava.js:17-27`). Tests cover overlapping Stop/Dispose and overlapping rejection followed by explicit retry (`test/cava.test.js:13,16`). Successful Node configuration handles also share removal (`src/host/node-process.js:26`, `test/node-process.test.js:7`).
- Diagnostic collection now removes ANSI/C0/C1/DEL/bidi controls and counts UTF-8 bytes without splitting valid surrogate pairs; emitted wrappers reserve their own byte budget (`src/diagnostics.js:2-17`, `src/sources/cava.js:48-49`, `src/host/node-process.js:30-33`). Unicode/control regression tests cover source and Node emitted errors (`test/cava.test.js:14`, `test/node-process.test.js:5`).
- AbovePrompt captures controller/epoch and rechecks after downstream composition, preserving the downstream tree when retired. Awaited actions and Button callbacks carry lifetime guards (`src/host/claude.js:36-59,73,80-86`); teardown, suspended expand, and retired Button regressions cover the relevant interleavings (`test/host.test.js:9-18`).
- Configuration write/removal double failure retains a Node cleanup owner, blocks allocation, carries an explicit cleanup-only handle for source adoption, and permits awaited explicit retry (`src/host/node-process.js:8-26`, `src/sources/cava.js:52`). Both port-level and source/port integration regressions verify ownership and successful successor capture after cleanup (`test/node-process.test.js:6`, `test/cava.test.js:15`). This application contract extension is explicitly documented (`docs/integration/host-contract.md:318-322`).

### Issues

- Critical: None.
- Important: None.
- Minor: None.

### Assessment

**Task quality:** Approved for this scoped fix gate.

**Reasoning:** The fixes directly address concurrent resource release, diagnostic byte/control limits, retired host rendering/actions, and failed-allocation ownership without weakening the native Audio gate. The supplied 23/23 focused and 54/54 full-suite evidence includes meaningful regressions for these paths.

**Checks:** Read the fix diff and appended implementer report. The initial tool output truncated the process/source hunks, so those hunks were recovered from the same diff. No broader crawl, additional tests, or full-suite rerun; no unresolved concrete doubt required one.
