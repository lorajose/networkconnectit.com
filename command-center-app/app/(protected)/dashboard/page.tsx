import { SuperAdminDashboard } from "@/components/dashboard/super-admin-dashboard";
import { ViewerDashboard } from "@/components/dashboard/viewer-dashboard";
import { getDashboardSnapshotForUser } from "@/lib/dashboard/service";
import { requireRoles } from "@/lib/auth";
import { routeAccess } from "@/lib/rbac";

export default async function DashboardPage() {
  const user = await requireRoles(routeAccess.dashboard);
  const snapshot = await getDashboardSnapshotForUser({
    role: user.role,
    organizationId: user.organizationId
  });

  if (snapshot.variant === "super-admin") {
    return <SuperAdminDashboard snapshot={snapshot} userRole={user.role} />;
  }

  return <ViewerDashboard snapshot={snapshot} userRole={user.role} />;
}
