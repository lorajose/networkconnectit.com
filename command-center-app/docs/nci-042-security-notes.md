# NCI-042 Security Notes

- Bid intake uses the existing commercial tenant access policy.
- `CLIENT_ADMIN` must have an organization identity and cannot select a different tenant.
- `VIEWER` is excluded from the `/bids` route and commercial writes.
- Bid/document tables carry `organizationId` to support explicit tenant predicates.
- Document `sourceKey` must point to private object storage; it must never be treated as a public download URL.
- Customer-facing proposal output must not expose internal vendor quote evidence or private storage keys.
