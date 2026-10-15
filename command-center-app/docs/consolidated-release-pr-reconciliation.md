# Consolidated release and PR reconciliation

Baseline: `fc43a8fbcb2973647f3e666a0c6475d38c4495ab`.

This candidate brings all distinct approved changes from the 28 open PRs into one release tree. Incorporated plans are not finished product features. #191 is superseded by #192, not independently merged. Existing MenuBoard, subscriptions, Project Pass, auth, immutable documents, NCI-066 and NCI-069 are preserved.

| PR | Scope | Disposition |
|---|---|---|
| [#197](https://github.com/lorajose/networkconnectit.com/pull/197) | Integration: Contractor OS + MenuBoard QA candidate | Previously incorporated; reconciled with current implementation |
| [#194](https://github.com/lorajose/networkconnectit.com/pull/194) | NCI-066: implement secure client design share links | Previously incorporated; reconciled with current implementation |
| [#193](https://github.com/lorajose/networkconnectit.com/pull/193) | NCI-030: implement immutable professional PDF snapshots | Previously incorporated; reconciled with current implementation |
| [#192](https://github.com/lorajose/networkconnectit.com/pull/192) | NCI-037: implement audit backup and operational observability controls | Previously incorporated; reconciled with current implementation |
| [#191](https://github.com/lorajose/networkconnectit.com/pull/191) | NCI-037: implement audit backup and observability controls | Superseded by #192; alternate runtime intentionally excluded |
| [#190](https://github.com/lorajose/networkconnectit.com/pull/190) | NCI-025: prepare camera advisor product positioning | Plan preserved; feature implementation/acceptance not complete |
| [#188](https://github.com/lorajose/networkconnectit.com/pull/188) | NCI-027: prepare real monitoring adapter implementation | Plan preserved; feature implementation/acceptance not complete |
| [#187](https://github.com/lorajose/networkconnectit.com/pull/187) | NCI-036: prepare public tool project persistence | Plan preserved; feature implementation/acceptance not complete |
| [#184](https://github.com/lorajose/networkconnectit.com/pull/184) | NCI-024: prepare real monitoring adapter architecture | Plan preserved; feature implementation/acceptance not complete |
| [#182](https://github.com/lorajose/networkconnectit.com/pull/182) | NCI-034: complete external user authentication lifecycle | Previously incorporated; reconciled with current implementation |
| [#181](https://github.com/lorajose/networkconnectit.com/pull/181) | NCI-046: prepare RFI and scope clarification workflow | Plan preserved; feature implementation/acceptance not complete |
| [#180](https://github.com/lorajose/networkconnectit.com/pull/180) | NCI-045: prepare vendor price book and quote tracking | Plan preserved; feature implementation/acceptance not complete |
| [#179](https://github.com/lorajose/networkconnectit.com/pull/179) | NCI-048: prepare estimated-vs-actual project cost tracking | Plan preserved; feature implementation/acceptance not complete |
| [#178](https://github.com/lorajose/networkconnectit.com/pull/178) | NCI-068: prepare DXF CAD handoff export | Plan preserved; feature implementation/acceptance not complete |
| [#177](https://github.com/lorajose/networkconnectit.com/pull/177) | NCI-067: prepare safe DXF import | Plan preserved; feature implementation/acceptance not complete |
| [#175](https://github.com/lorajose/networkconnectit.com/pull/175) | NCI-072: reconcile Design Studio entitlements with NCI-017 | Plan preserved; feature implementation/acceptance not complete |
| [#174](https://github.com/lorajose/networkconnectit.com/pull/174) | NCI-071: prepare zero-knowledge and local-only security architecture | Plan preserved; feature implementation/acceptance not complete |
| [#173](https://github.com/lorajose/networkconnectit.com/pull/173) | NCI-070: prepare tablet and field Design Studio workstream | Plan preserved; feature implementation/acceptance not complete |
| [#172](https://github.com/lorajose/networkconnectit.com/pull/172) | NCI-069: prepare aerial site background workstream | Previously incorporated; reconciled with current implementation |
| [#171](https://github.com/lorajose/networkconnectit.com/pull/171) | NCI-074: prepare current consolidated V1 release gate | Unique changes integrated in this candidate |
| [#170](https://github.com/lorajose/networkconnectit.com/pull/170) | NCI-033: prepare current production hardening gate | Unique changes integrated in this candidate |
| [#169](https://github.com/lorajose/networkconnectit.com/pull/169) | NCI-073: reconcile current Design Studio release QA | Previously incorporated; reconciled with current implementation |
| [#168](https://github.com/lorajose/networkconnectit.com/pull/168) | NCI-017: add subscription status experience | Previously incorporated; reconciled with current implementation |
| [#167](https://github.com/lorajose/networkconnectit.com/pull/167) | NCI-017: wire persisted effective subscription access | Previously incorporated; reconciled with current implementation |
| [#166](https://github.com/lorajose/networkconnectit.com/pull/166) | NCI-017: implement Pro and Business subscriptions | Previously incorporated; reconciled with current implementation |
| [#165](https://github.com/lorajose/networkconnectit.com/pull/165) | NCI-023: align public tool claims and Command Center positioning | Unique changes integrated in this candidate |
| [#164](https://github.com/lorajose/networkconnectit.com/pull/164) | NCI-016: define server-verified Project Pass entitlement | Previously incorporated; reconciled with current implementation |
| [#163](https://github.com/lorajose/networkconnectit.com/pull/163) | NCI-011: define Field Scope contract | Unique changes integrated in this candidate |

## QA and release gates

- Run full Command Center CI and Public Site Quality on the exact release SHA.
- NCI-011 adds survey review → Takeoff/BOM, serialized concurrent submission, rollback and tenant-isolation MySQL coverage.
- NCI-023 reconciles four public landing pages and links the Command Center landing to the canonical app host.
- NCI-033 audits all production migration history read-only, rejecting drift and incomplete records.
- NCI-074 checks live Stripe configuration for production; isolated QA continues to use the QA runtime gate and Stripe test mode.
- No new database migration is introduced by this cleanup candidate.
- Perform browser/device QA against the deployed exact SHA; record actual PASS/FAIL in NCI-073 and the subscription QA matrix.
- Mark tickets Done only after their acceptance evidence exists. Plans for monitoring, DXF, local-only encryption, RFI, vendor prices, tablet UX and related work remain unfinished features.
- Node.js hosting access, production backup, migration-history audit and provider configuration must be verified before production deployment. Static cPanel publication does not deploy the Node.js application.
