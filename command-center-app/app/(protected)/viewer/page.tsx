import { ProjectScopeFilter } from "@/components/dashboard/project-scope-filter";
import { ViewerDashboard } from "@/components/dashboard/viewer-dashboard";
import { getViewerPortalSnapshotForUser } from "@/lib/dashboard/service";
import { requireRoles } from "@/lib/auth";
import { getProjectOptions } from "@/lib/management/projects";
import { getSearchParamValue } from "@/lib/management/search-params";
import { routeAccess } from "@/lib/rbac";

type ViewerPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ViewerPage({ searchParams = {} }: ViewerPageProps) {
  const user = await requireRoles(routeAccess.viewer);
  const projectId = getSearchParamValue(searchParams.projectId);
  const projectOptions = await getProjectOptions(
    user,
    user.organizationId || undefined
  );
  const selectedProject = projectOptions.find((project) => project.id === projectId);
  const snapshot = await getViewerPortalSnapshotForUser({
    role: user.role,
    organizationId: user.organizationId,
    projectInstallationId: selectedProject?.id,
    projectName: selectedProject?.name
  });

  return (
    <ViewerDashboard
      snapshot={snapshot}
      userRole={user.role}
      viewerPortal
      extraActions={
        <ProjectScopeFilter
          actionPath="/viewer"
          projects={projectOptions}
          selectedProjectId={selectedProject?.id}
        />
      }
    />
  );
}
