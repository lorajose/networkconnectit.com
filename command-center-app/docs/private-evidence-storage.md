# Private Evidence Storage

Company Operations receipt metadata is tenant-scoped in MySQL, but receipt bytes must remain private and outside the public Next.js asset tree.

## Contract

`lib/private-evidence/storage.ts` defines the provider-neutral storage boundary. Storage keys are opaque provider references and receipt authorization remains in the Company Operations repository before any object is read.

Current production behavior intentionally fails closed because no private object-storage provider has been configured yet.

Required provider guarantees:

- private objects by default; no public bucket/container access
- server-side credentials only
- object keys scoped under `organizations/{organizationId}/expenses/{expenseId}/...`
- upload size and MIME allow-list enforcement
- authorized download only after tenant/direct-ID validation
- delete support for replacement/retention workflows
- credentials supplied through runtime environment, never committed

Do not place receipts in `public/`, return raw provider credentials, or expose a storage key as proof of authorization.
