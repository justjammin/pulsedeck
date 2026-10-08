# Final scoped re-review

**Verdict: approved for the development-preview scope.** The Important version-probe ownership finding in final-review.md is resolved at `32c74bb`. No new blocking findings.

Reviewed only `review-8a9ab61..32c74bb.diff`, final-fix-report.md and the affected Node-port/source ownership interaction. No whole-branch review or full-suite rerun.

- Probe ownership is registered before launch; failed termination preserves the child and owner, while clearing only the rejected cleanup promise for retry.
- Pending ownership blocks another check, configuration allocation and normal public spawn. The internal probe bypass exists only for its synchronous launch invocation.
- `retryCleanup()` and the existing source-adopted `error.cleanup.remove()` share cleanup and remove the owner only after termination succeeds.
- An unresolved launch remains owned after the check timeout. Its eventual handle is stopped by the existing cleanup promise; a late stop failure remains explicitly retryable.
- Rejected spawn is handled without retaining a phantom owner, and successful version checks finish cleanup before returning capability data.

Fresh focused verification: `node --test --test-name-pattern='timed-out version|probe handle resolving|probe launch is already|real Node read-only' test/node-process.test.js` — **4 passed, 0 failed**. Additional inline check: a real ENOENT launch clears the pending owner and permits a succeeding real Node version check. Full-suite **62/62** and build/release checks remain the implementer's reported evidence, not rerun here.

Approval does not establish native compatibility or satisfy the one-install CAVA release requirement. Actual bundled binaries/private-library provenance, verified native streaming/kill/temp contracts, clean-machine capture, native UI/teardown and measured CPU/RSS/retained-heap/p95 targets remain the previously documented release gates. Native Audio remains disabled and release packaging stays blocked.
