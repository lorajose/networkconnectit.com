# NCI-073 — Runtime Security Matrix

Run with two organizations, A and B.

| Actor | Own tenant read | Own tenant write | Cross-tenant direct ID | Design export |
| --- | --- | --- | --- | --- |
| SUPER_ADMIN | Expected per internal admin policy | Expected per internal admin policy | Internal/global behavior only as explicitly authorized | Expected per policy |
| INTERNAL_ADMIN | Expected per internal admin policy | Expected per internal admin policy | Internal/global behavior only as explicitly authorized | Expected per policy |
| CLIENT_ADMIN A | A only | A only where permitted | Must fail closed for B | A only where permitted |
| VIEWER A | A read-only | Must fail | Must fail closed for B | Read/export only if policy permits; no mutation |

Repeat direct-ID checks for project, site, device, design, takeoff/BOM, topology/capacity and report/export routes. Also test server actions/API-style writes, not only page navigation.