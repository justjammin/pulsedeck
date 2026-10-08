# Final scoped fix: retain CAVA version-probe ownership

Base: 78538c0. Scope: the one Important final-review defect in Node version checking. No controller/native adapter/packaging policy changes.

## Change

A version-probe owner is inserted into the port pending-owner registry before invoking spawn. It owns the spawn promise and adopts the eventual child handle. Cleanup uses one shared in-flight promise; rejected stop retains ownership and clears only the failed promise so explicit retry can terminate the same child. New check/config/public spawn calls are blocked while any pending owner exists. The internal argv-only version launch has a narrow synchronous bypass for its own barrier.

Check errors with unresolved cleanup carry `error.cleanup.remove()`, using the existing source adoption path. `retryCleanup()` handles probes as well as failed config directories. `pendingCleanupCount()` now counts active/pending/unconfirmed version probes plus failed config owners; returned successful configuration handles and capture children retain their existing separate source/handle ownership.

If spawn has not resolved at the actual two-second timeout, check returns the bounded timeout error and cleanup handle. An already-owned cleanup promise waits for and stops a late handle. A late cleanup rejection stays owned and explicit retry reuses the same child. Successful checks await confirmed cleanup before returning capability data. Version/probe wrappers continue using the UTF-8 diagnostic cap.

## RED evidence

Exact command:

`node --test --test-name-pattern='timed-out version|probe handle resolving' test/node-process.test.js`

Result: 0 passed, 2 failed. Both failures asserted pendingCleanupCount1 but observed0. Real two-second timeout durations were 2011ms and2005ms. The first exercises the CAVA source/check boundary, rejected termination and successor blocking; the second holds spawn unresolved beyond timeout then supplies its late handle.

## GREEN evidence

`node --test test/node-process.test.js test/cava.test.js` -> initially18/18; final focused run20/20 after two additional unchanged-behavior checks. Tests confirm one spawn while cleanup is unconfirmed; no config allocation/new source start; source-dispose retry adopts the probe owner; concurrent source/port cleanup shares stop; retry succeeds and next check is allowed. Late-resolving launch is stopped once and concurrent explicit cleanup shares that operation. Late stop failure stays owned until explicit retry. A real Node `-v` check returns process.version and pendingCleanupCount0.

`npm test` -> **62 passed / 0 failed**, exit0. Full suite run once after the final code/test edits, including packaging/CLI/parser/preferences/core/lifecycle/native-mock coverage. npm emitted its environment http-proxy configuration warning; test output otherwise passed without cancellation/skips.

`npm run build` -> exit0, development preview built with0 bundled targets and native Audio disabled.

`node scripts/vendor-cava.mjs` -> exit0, reports0 targets and no binaries included.

`node scripts/build.mjs --release` -> expected exit1: native Audio disabled; actual audited bundled CAVA payloads required.

`git diff --check` -> clean.

## Remaining concerns

The native Audio binding remains disabled. Actual CAVA/private-library payloads, native host contracts/installed-build UI acceptance, clean-machine one-install capture, live output-only capture and measured resource budgets remain release gates. The real process check uses Node's read-only version option to verify process ownership; it does not establish actual CAVA capture. Fault-injected spawn promises/stop failures establish port cleanup invariants rather than native-host ABI behavior.
