# NCI-024 — Real Monitoring Adapter Architecture

## Target flow
Scheduler/Queue → Monitoring Adapter → Normalized Health Observation → HealthCheck → Device Status → Alert Policy.

## Contract
- Polling never runs inside interactive web requests.
- Adapter returns normalized observations with source/provenance and timestamps.
- Timeouts, retries, exponential backoff, jitter and rate limits are explicit.
- Credentials use server-side secret storage and least privilege.
- Alert dedupe/suppression operates on normalized observations.
- Simulation is available only in demo/test runtime.

## Implementation gate
NCI-027 must implement this contract rather than coupling directly to a vendor SDK.