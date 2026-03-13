import { ViewerDashboard } from "@/components/dashboard/viewer-dashboard";
import { getViewerPortalSnapshotForUser } from "@/lib/dashboard/service";
import { requireRoles } from "@/lib/auth";
import { routeAccess } from "@/lib/rbac";

export default async function ViewerPage() {
  const user = await requireRoles(routeAccess.viewer);
  const snapshot = await getViewerPortalSnapshotForUser({
    role: user.role,
    organizationId: user.organizationId
  });

  return (
    <ViewerDashboard
      snapshot={snapshot}
      userRole={user.role}
      viewerPortal
    />
  );
}
