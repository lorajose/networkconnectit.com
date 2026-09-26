import { getCurrentUser } from "@/lib/auth";
import type { AppRole } from "@/lib/rbac";
import { hasRequiredRole } from "@/lib/rbac";

export async function requireApiRoles(allowedRoles: readonly AppRole[]) {
  const user = await getCurrentUser();
  if (!user?.id || !user.email || !user.role) {
    return { ok: false as const, status: 401 as const, user: null };
  }
  if (!hasRequiredRole(user.role, allowedRoles)) {
    return { ok: false as const, status: 403 as const, user: null };
  }
  return { ok: true as const, status: 200 as const, user };
}
