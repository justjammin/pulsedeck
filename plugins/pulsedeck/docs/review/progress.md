# SDD ledger — plan: docs/superpowers/plans/2026-10-08-pulsedeck.md

## Approval and scope rulings
User requested build and medium reasoning engineering subagents, then explicitly requested resume. Continue from published local spec/tickets. New isolated project branch; no prior repository to protect. No external publishing.
Batch original engine tickets into Task1 so fake source lifecycle can be verified before unavailable native capture. Original 9-ticket tracker remains authoritative for acceptance; no native criteria auto-resolved.
JavaScript chosen for dependency-free host code; generated host types unavailable, so native typecheck pending.

## Preflight conflict scan
| Tasks | Producer / consumer | Finding and ruling |
|---|---|---|
|1 / 2|Controller sourceFactory and frame callback -> CAVA and host adapter|Explicit async handle/start contract shared; source callbacks generation guarded. Read actual implementation before wiring.|
|1 / 3|Controller render + demo -> CLI demo / benchmark|Exported bounded raster contract consumed; renderer owned bytes cannot stand in for host RSS.|
|2 / 3|Plugin/register package + preferences -> build and smoke harness|Task3 bundler follows verified import policy, no assumed native validity.|
|1|Tests vs files and core semantics|Consistent, 9-ticket graph reordered only for generic lifecycle; thresholds left to documented implementation.|
|2|Tests vs native evidence|Mock harness establishes intent only. API unknowns require safe blocker, never guessing.|
|3|Packaging vs release gates|Development preview artifact only, native ticket09 stays blocked.|

Task 1 BASE: 8a452a4

## User steering: required CAVA dependency
User asked to have CAVA as a dependency. It is the required system executable for real audio; Demo remains available without it. Check dependency/capability and document installation. No dependency auto-installation or unrelated machine modification authorized. Packaging must state this clearly.

## Native integration ruling
Official v2.1.290 docs advertise spawn but linked public types are2.1.277 and omit streaming/cancel contract. No fs temp/remove API is published. Do not guess native signatures. Build injectable CAVA source + real Node OS port for standalone capture and verify with fake process; native host demo works from documented APIs, native Audio gated until target /plugin-types supplied. Cost if wrong: preview cannot capture audio inside Claude yet, explicitly reported; avoids orphan CAVA processes from fabricated kill APIs.
Host clock.now is async: cached clock time adapter updated before period callbacks; preserve timing behavior and document tests.

## Corrected user steering: CAVA included on plugin install
User clarified no manual CAVA setup. Supersedes system-executable-prerequisite ruling. Release plugin bundles per-platform CAVA+necessary private libraries, checksum pinned, plugin-contained paths, notices/source audit. Normal Claude installs disable lifecycle scripts and upstream no standalone Linux/mac binaries; source build pipeline/audited binaries needed. Dev build cannot claim zero-setup release; releasepackaging fails closed absent binaries. Cost if wrong: development preview remains release-blocked, explicitly visible.

Task 1 integrated product commit 53228c7 (original isolated worker commit5b83d9b); fresh task reviewer dispatched. Main branch before integration had parent scope/docs updates; task review BASE f89be2c isolates product-only diff. Report evidence22tests, two fixedRGBA buffers, controller50432bytes; native cleanup timing still pending and source cancellation interface limitation noted for adapter task.

Task 1 fix round1: reviewer found rejected handle.stop loses ownership (permits duplicate producer), demo concurrentstart leaks timer. Existing implementer resumed to retain failedcleanup ownership and serialize demo startup; scoped re-review required before Task2. Minor borrowedbufferdocumentation and stalecleanupdiagnostic included in related fix. Review text preserved.

Task1 fix round2: scoped review confirmed original ownership and Demo timer defects fixed but found queued Stop/Start after rejected automatic cleanup could create a live source while state remained Error with no render timer. Existing implementer resumed; ensure startup state installed after successful queued cleanup, before source starts. Scoped re-review needed.

Task 1: complete
Final headf00fe8f after scopebasef89be2c. Fresh review + two fix rounds approved; originalownership anddemo leaks plus queuedrestart regression fixed. Evidence30discoveredtests (29behavioral), focused8/8, ownedcore50432bytes. Minor compressed preset/test formatting remains parked for broad review; no correctness blocker. Native cancellation timing remains releasegate. Task2 BASE f00fe8f.

Task2 product commit6e56390; scopedreviewBASE220d40a excludes separateparentresearchdocs. Evidence44tests inclhelper; hostAudioexplicitlygated, devNodeCAVAports andprefs native mocksimplemented. Reviewpending, two concrete defectsunderinspection: concurrentCAVAStop duplicatesresourcecleanup and diagnostic2048characters exceedsbinding2048UTF8bytes.

Task2 fix round1: scopedreview fourImportant findings: CAVAconcurrentstopduplicatescleanup, Unicode/control diagnostics exceed2048byte cap, host teardown during awaitedrender next(e) nullscontroller, tempwrite failure+removefailurelosesdirectoryownership. Sameimplementer resumed RED/regressions+targetedfixes. Portextension for startupfailureownedcleanup allowed narrowly, mustdocument andretain retrybarrier; not broadcore rewrite.

Task2 fix commitc52b1e3: sharedcleanupinflight/retry, UTF8/control sanitization helper, lifecycle epoch guards after async hostawait and retiredButtons, owned configfailure error.cleanup.remove adopted by source and explicit Node.retryCleanup. Evidencefocused23/23/full54/54; scopedrereviewpending. Native gates unchanged.

Task 2: complete
Scoped fix review approved all4originalImportant findings, no newbreakage. HEADc52b1e3, full54tests (53behavioral) reportedclean. Native Audio gated; bundledreleaseartifacts stillabsent. Task3 BASEc52b1e3.

Task 3: complete
HEAD78538c0, scoped packaging review approved nofindings. Development-previewscopeonly: resolver checks0actualpayloads; releaseflagfails nativeAudioReadyfalse. Root freshverification Node58/58, build0,3finiteDEMOs0, benchmarkcorearrays50432before/after, parser4128,pending0; expectedreleaseexit1. Original9tickets partial/blocked,09blocked. Finalwholebranchreviewpending. ActualengineDemo PNG rendered by root fromRGBAframes at4s, no realaudio/nativeclaim.

Finalwholebranchreview: Importantversionprobecleanupownership atNodeportcheck lostifstoprejects; focusedreprolive2/spawns2/pendingcleanup0 after2sequentialtimeouts, retryCleanupdoesnothing. Late-resolving probe also mustremainowned. ONEscopedfinalfix dispatchedexistingintegrationworker on78538c0, nootherblockingfindings. Native/releasegatesnotmisclaimed. Finalre-review willscopeonlythisrepair.

Final scoped re-review: approved at32c74bb; original probe ownership defect resolved, no new blocking findings. Root fresh full suite62/62 passes, development build succeeds; release expected exit1. Native capture/bundled payloads and ticket09 remain blocked. Reports and ledger copied to docs/review before disposable SDD cleanup. No remote integration requested or available; preserve feature branch and reviewable artifacts.
