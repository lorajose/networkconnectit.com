import type { AppRole } from "@/lib/rbac";

import {
  commercialReadScope,
  type CommercialActor,
} from "./commercial-access";
import type { ProjectPassProduct } from "./project-pass";
import { hasServerVerifiedProjectPass } from "./project-pass-repository";

export type ProjectPassAccessActor = {
  id: string;
  role: AppRole;
  organizationId?: string | null;
};

export type ProjectPassAccessRequest = {
  organizationId?: string;
  projectInstallationId: string;
  product: ProjectPassProduct;
};

/**
 * Server-only premium-output authorization.
 *
 * Tenant-scoped users are forced to their session organization. Internal
 * administrators must explicitly select an organization. Browser state,
 * query-string return flags and sessionStorage never participate in this
 * decision.
 */
export async function requireServerVerifiedProjectPassAccess(
  actorInput: ProjectPassAccessActor,
  request: ProjectPassAccessRequest
) {
  const actor: CommercialActor = {
    role: actorInput.role,
    organizationId: actorInput.organizationId ?? null,
  };

  const scope = commercialReadScope(actor, request.organizationId);
  const projectInstallationId = request.projectInstallationId.trim();

  if (!projectInstallationId) {
    throw new Error("Project Pass project is required");
  }

  const authorized = await hasServerVerifiedProjectPass({
    organizationId: scope.organizationId,
    projectInstallationId,
    product: request.product,
  });

  if (!authorized) {
    throw new Error("Project Pass entitlement is required for this premium output");
  }

  return {
    organizationId: scope.organizationId,
    projectInstallationId,
    product: request.product,
  } as const;
}
