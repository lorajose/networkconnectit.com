import { ProjectScopeFilter } from "@/components/dashboard/project-scope-filter";
import { SuperAdminDashboard } from "@/components/dashboard/super-admin-dashboard";
import { ViewerDashboard } from "@/components/dashboard/viewer-dashboard";
import { getDashboardSnapshotForUser } from "@/lib/dashboard/service";
import { requireRoles } from "@/lib/auth";
import { getProjectOptions } from "@/lib/management/projects";
import { getSearchParamValue } from "@/lib/management/search-params";
import { routeAccess } from "@/lib/rbac";

type DashboardPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function DashboardPage({
  searchParams = {}
}: DashboardPageProps) {
  const user = await requireRoles(routeAccess.dashboard);
  const projectId = getSearchParamValue(searchParams.projectId);
  const projectOptions = await getProjectOptions(
    user,
    user.organizationId || undefined
  );
  const selectedProject = projectOptions.find((project) => project.id === projectId);
  const snapshot = await getDashboardSnapshotForUser({
    role: user.role,
    organizationId: user.organizationId,
    projectInstallationId: selectedProject?.id,
    projectName: selectedProject?.name
  });

  const filter = (
    <ProjectScopeFilter
      actionPath="/dashboard"
      projects={projectOptions}
      selectedProjectId={selectedProject?.id}
    />
  );

  if (snapshot.variant === "super-admin") {
    return (
      <SuperAdminDashboard
        snapshot={snapshot}
        userRole={user.role}
        extraActions={filter}
      />
    );
  }

  return (
    <ViewerDashboard
      snapshot={snapshot}
      userRole={user.role}
      extraActions={filter}
    />
  );
}
