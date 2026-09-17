# NCI-073 — Report Safety Checks

Use representative records populated with clearly synthetic markers so accidental leakage is obvious.

## Design report

- INTERNAL may include internal pricing when requested.
- CLIENT_SAFE must not include hidden/internal pricing.
- Disabled layers/sections must not reappear in issued evidence.
- Issued evidence must retain profile, section/layer selection, version and integrity metadata.

## Commissioning report

- Raw credentials/secrets must never appear.
- Before NCI-031 is Done, verify which operational fields are permitted in CLIENT_SAFE output.
- Synthetic markers placed in internal-only network/vault/remote-access fields must be absent from CLIENT_SAFE output once the profile is implemented.

## Direct-request bypass

Repeat client-safe requests with altered query/body parameters. Server-side policy must remain authoritative; a caller must not be able to re-enable prohibited pricing or internal fields.