### Spec Compliance

- ❌ Issues found: concurrent cleanup is not idempotent (`src/sources/cava.js:16-21`), diagnostics exceed the binding 2048-byte cap (`src/sources/cava.js:43-44`, `src/host/node-process.js:16-19`), and a render interrupted by session disposal throws (`src/host/claude.js:77-84`). Failed configuration creation can also lose temporary-directory ownership (`src/host/node-process.js:10-11`).
- ⚠️ Native streaming capture remains an explicitly ruled integration blocker, not an omitted implementation requirement. Installed host ABI, command namespacing, native UI behavior, actual CAVA capture, and bundled supported-platform release binaries remain unverified/pending as reported (`docs/integration/host-contract.md:305-316`, `hooks/register.js:1-2`). Task 3/release validation must establish these before acceptance claims.

### Strengths

- Source validation precedes capability probes or allocation, rejects control/injection strings and `auto_input`, requires monitor/tap sources, and requires double attestation for bundled `auto`; explicit output configuration and argv launch are isolated from the native adapter (`src/sources/cava.js:2-12,24-41`).
- Preferences use an actual UTF-8 2048-byte measurement, strip unknown fields and active authorization, default malformed data, and delete only the plugin key (`src/preferences.js:2-19`).
- Native Audio remains gated with actionable Setup guidance; Demo uses explicit actions. AbovePrompt composes `next(e)`, terminal-only Raster packing consumes the borrowed buffer synchronously, and controls use the documented Button fields (`src/host/claude.js:6-18,42-46,59-80`).
- Stop-before-launch, rejected cleanup retries, reset/close interaction, terminal/desktop rendering, and real Node process/filesystem behavior have focused coverage (`test/cava.test.js:7-12`, `test/host.test.js:5-8`, `test/node-process.test.js:3-4`).

### Issues

#### Critical (Must Fix)

- None.

#### Important (Should Fix)

- `src/sources/cava.js:16-21`: overlapping `handle.stop()`/`dispose()` calls both enter release before the first await finishes, invoking child stop and configuration removal repeatedly. Focused reproduction with a deferred child stop and two concurrent handle stops produced `{stop: 2, remove: 2}`. This violates awaited idempotent disposal and can race a non-reentrant cleanup port. Keep one per-owner in-flight release promise; clear that promise on rejection so a subsequent explicit retry still owns and retries the failed resource.
- `src/sources/cava.js:43-44`, `src/host/node-process.js:16-19`: tails use UTF-16 `.slice(-2048)` rather than UTF-8 bytes. A focused reproduction feeding 2048 euro characters retained 6144 bytes of stderr and emitted a 6161-byte error. Both the source stderr tail and Node version-check diagnostic accumulation violate the confirmed global 2048-byte diagnostic cap. The source filter removes C0/DEL only; C1 control characters survive, and the Node port retains unsanitized escape/control text. Sanitize terminal controls/escape sequences and use a bounded UTF-8 diagnostic collector, budgeting the emitted wrapper if the cap applies to the full message.
- `src/host/claude.js:77-84`: AbovePrompt verifies controller existence before `await next(e)` and then dereferences the mutable global controller after that await. Session end can dispose and null it in between. Focused mock reproduction suspended `next`, ran session end, resumed `next`, and received `Cannot read properties of null (reading 'snapshot')`. Recheck lifetime/generation after composition and return the preserved downstream tree when retired. Apply the same lifetime guard to actions that await host calls before touching controller state.
- `src/host/node-process.js:10-11`: if writing a newly allocated config fails and the catch-path `rm` also fails, createConfig rejects without returning or retaining an owner for the allocated directory. Neither source disposal nor a port retry can recover that directory. Retain pending temporary cleanup inside the port (and expose/await a retry path) until removal succeeds; preserve the original allocation/write error with cleanup context. The success-path removal handle already retains retry ownership, but this allocation-failure path does not.

#### Minor (Nice to Have)

- None.

### Assessment

**Task quality:** Needs fixes.

**Reasoning:** The task correctly separates unsupported native capture from working Demo/source boundaries and implements the requested controls and preference safeguards. The cleanup interleaving, byte-limit violation, and teardown/render race block approval despite the recorded 44/44 full-suite result.

**Focused checks:** Read the supplied diff; initial tool output cut off the host/process hunks, so those hunks were recovered from the same diff. Read unchanged controller/Demo implementations only to inspect host disposal, timer cancellation, and borrowed-render ownership; read host-contract.md only to check literal API/UI/lifecycle contracts. Ran two small read-only Node reproductions for concurrent release/Unicode diagnostics and render/session-end interleaving; did not rerun the suite or native/live-audio checks. The configuration-write/removal double-failure finding follows directly from the catch path and was not fault-injected.
