# Command Center Deployment Decision Record

Complete before implementing automated Command Center production deployment.

- Selected host/runtime:
- Public app URL/base path:
- Node version:
- Process manager/application startup method:
- Repository/build artifact path:
- Persistent environment configuration method:
- MySQL endpoint strategy:
- Prisma migration execution method:
- Private bid storage driver:
- Restart method:
- Health/smoke verification method:
- Rollback application SHA procedure:
- Owner/operator:

## Decision criteria

The chosen runtime must support Next.js standalone execution, persistent secrets/environment variables, database connectivity, authentication callbacks, migrations, logs/restarts, and private bid-document storage. Do not automate deployment until each item is verified.