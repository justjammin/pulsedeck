### Finding Verdicts

- **Rejected cleanup loses producer ownership** — ADDRESSED. `src/core/controller.js:65–82` retains the handle until termination fulfills and sets a cleanup barrier on rejection; `src/core/controller.js:139–174` blocks replacement while cleanup is unresolved and owns late startup handles before cleaning them. Explicit Stop retries retained termination (`src/core/controller.js:185–198`). Regression coverage: `test/lifecycle.test.js:28–92`.
- **Concurrent Demo operations leak timers** — ADDRESSED. `src/sources/demo.js:8–35` performs cancellation and successor timer ownership synchronously, scopes old handles to their own producer, and guards retired callbacks; disposal cancels the active producer (`src/sources/demo.js:37–40`). Regression coverage: `test/lifecycle.test.js:120–143`.
- **Retired cleanup failure overwrites newer state guidance** — ADDRESSED for the original defect. Cleanup failure is now an explicit current owned-resource Error with Stop retry guidance, rather than an asynchronous catch overwriting a Stopped message (`src/core/controller.js:72–96`). Successful current Stop restores Stopped guidance (`src/core/controller.js:194–197`); covered in `test/lifecycle.test.js:95–118, 144–167`. A different overlap introduced by that restoration guard is listed below.
- **Borrowed render-buffer lifetime lacks API documentation** — ADDRESSED. `src/core/controller.js:229–233` and `src/core/raster.js:17` explicitly state immediate overwrite by subsequent renders and require copying for stable pixels.
- **Compressed implementation/tests reduce maintainability** — PARTIALLY ADDRESSED, non-blocking. Touched Demo code and new lifecycle tests are readable; original compressed preset/core tests are untouched and remain the previous Minor observation.
- **Initial npm environment warning** — No production fix required. Appended evidence reports clean direct Node focused/full runs; native timing and cancellation remain pending.

### New Breakage in the Fix Diff

- **Important — `src/core/controller.js:69–70, 165–176, 194–197`: successful queued Start can leave a live producer in Error with no render/timeout timer.** Reproduction: start capture; trigger an error whose automatic cleanup remains pending; queue explicit Stop and then explicit Start; reject the first cleanup; the Stop retry successfully terminates the retained producer; the queued Start then creates its replacement. Failure publication has changed state to Error, the successful Stop skips state restoration because a newer Start owns the generation, and startup transitions to Waiting only when state is still Checking. Observed result: `starts=2, live=1, state=Error, schedules=[]`, with stale guidance claiming cleanup still failed despite successful cleanup and startup. This prevents no-frame Waiting/timeout behavior and truthful UI state. When a queued Start actually becomes current after successful termination, re-establish its Checking state/timer (or unconditionally establish Waiting on successful current startup unless frames already changed it), preserving generation ownership. Add a regression covering a newer queued Start after an older cleanup failure and successful explicit Stop retry.

### Out-of-Scope Observations

- None beyond the previously recorded non-blocking readability observation. Native adapter timing/capture criteria remain pending and do not block this core fix round.

### Verdict

**Fix round:** Original Important findings and related cleanup-message/buffer-documentation findings addressed; new Important queued Stop/Start state/timer regression remains open.

**Checks:** Read the fix diff once and the appended fix report; no whole-suite rerun, git commands or subagents. Report names the seven lifecycle regressions and reports clean focused 7/7 plus full 29/29 results. Ran one additional focused read-only Node reproduction for the newly identified queued Stop/Start interleaving, which the existing reported tests do not cover; output confirmed a live replacement in Error with no scheduled timers.
