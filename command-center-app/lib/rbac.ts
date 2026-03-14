export const APP_ROLES = [
  "SUPER_ADMIN",
  "INTERNAL_ADMIN",
  "CLIENT_ADMIN",
  "VIEWER"
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const roleLabels: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  INTERNAL_ADMIN: "Internal Admin",
  CLIENT_ADMIN: "Client Admin",
  VIEWER: "Viewer"
};

export const routeAccess = {
  dashboard: APP_ROLES,
  commandMap: ["SUPER_ADMIN", "INTERNAL_ADMIN"] as const,
  organizations: ["SUPER_ADMIN", "INTERNAL_ADMIN", "CLIENT_ADMIN"] as const,
  projects: APP_ROLES,
  sites: APP_ROLES,
  devices: APP_ROLES,
  alerts: APP_ROLES,
  viewer: APP_ROLES,
  users: ["SUPER_ADMIN", "INTERNAL_ADMIN", "CLIENT_ADMIN"] as const,
  settings: ["SUPER_ADMIN", "INTERNAL_ADMIN", "CLIENT_ADMIN"] as const
} as const;

export function isCommandCenterAdminRole(role: AppRole) {
  return role === "SUPER_ADMIN" || role === "INTERNAL_ADMIN";
}

export function isTenantScopedRole(role: AppRole) {
  return role === "CLIENT_ADMIN" || role === "VIEWER";
}

export function canManageOrganizations(role: AppRole) {
  return isCommandCenterAdminRole(role);
}

export function canWriteTenantInventory(role: AppRole) {
  return role !== "VIEWER";
}

export function isReadOnlyRole(role: AppRole) {
  return role === "VIEWER";
}

export function canAcknowledgeAlerts(role: AppRole) {
  return role === "SUPER_ADMIN" || role === "INTERNAL_ADMIN" || role === "CLIENT_ADMIN";
}

export function canResolveAlerts(role: AppRole) {
  return role === "SUPER_ADMIN" || role === "INTERNAL_ADMIN";
}

export function canRunHealthSimulation(role: AppRole) {
  return role === "SUPER_ADMIN" || role === "INTERNAL_ADMIN";
}

export function hasRequiredRole(
  role: AppRole | undefined,
  allowedRoles: readonly AppRole[]
) {
  if (!role) {
    return false;
  }

  return allowedRoles.includes(role);
}
