# PulseDeck requirements traceability

The matrix maps release requirements to proposed implementation tickets. It is a planning check, not evidence that code exists or acceptance criteria have passed.

| Product requirement | Main ticket | Supporting technical requirements |
| --- | --- | --- |
| P01 Open controls | 01 | T04, T11 |
| P02 Start and stop | 02, 03 | T01, T04, T10 |
| P03 Actual system audio | 02 | T02, T03, T07, T12 |
| P04 Spectrum | 01, 02 | T05, T06 |
| P05 Ocean | 04 | T05, T06 |
| P06 Grid | 04 | T05, T06 |
| P07 Live preset switching | 04 | T01, T06 |
| P08 Compact and expanded | 05 | T05, T11 |
| P09 Quiet and unavailable states | 02, 03 | T04, T08, T12 |
| P10 Error recovery | 03, 08 | T04, T08, T10 |
| P11 Labeled demo | 01 | T04, T12 |
| P12 Reduced motion | 06 | T05, T09, N05 |
| P13 Preference persistence | 06 | T09 |
| P14 Resource bounds | 07, 09 | T02, T03, T05, T08, N01-N08 |
| P15 Cleanup | 03, 09 | T01, T10, N09 |
| P16 Setup guidance | 08, 09 | T07, T12 |
| P17 Source selection | 06, 08 | T01, T04, T07 |
| P18 Reset | 06 | T09, T10 |

## Consistency checks completed

The approved scope uses one thirty-two-band transport throughout. Demo is a source kind with an Active phase, not an additional conflicting lifecycle state. Closing the expanded pane compacts the view while Stop ends capture. Performance targets remain distinct from measured results. Windows and Desktop remain unadvertised until tested. All nine tickets have acceptance outcomes and the dependency graph has no cycle.

## Release evidence still needed

Actual generated Claude host contracts, native plugin validation, real audio on the target platforms, source permissions, teardown semantics, latency, CPU, and total incremental RSS. These are ticket 08 and ticket 09 gates; source-only or mock results cannot mark them complete.
