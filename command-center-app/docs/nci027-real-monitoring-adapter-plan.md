# NCI-027 — Implement Real Monitoring Adapter

## Implementation sequence
1. Adopt NCI-024 normalized adapter interface.
2. Select one safe, customer-relevant monitoring source/protocol.
3. Run collection in scheduler/worker runtime, never request handlers.
4. Enforce timeouts/retries/backoff/rate limits.
5. Persist provenance-bearing normalized observations into existing HealthCheck/status/alert flow.
6. Keep simulation behind demo/test runtime gates only.

## Safety
Credentials remain server-side and tenant-scoped. Adapter errors cannot fabricate healthy state.

## QA
Timeout, retry, stale observation, vendor failure, tenant isolation, provenance and simulation-production gate tests.