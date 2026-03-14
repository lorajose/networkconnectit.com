import Link from "next/link";
import {
  ProjectInstallationStatus,
  ProjectType
} from "@prisma/client";
import { Plus, Search } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SummaryTable } from "@/components/dashboard/summary-table";
import { FilterBar } from "@/components/management/filter-bar";
import { PaginationControls } from "@/components/management/pagination-controls";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireRoles } from "@/lib/auth";
import { buildHref } from "@/lib/management/pagination";
import { getProjectsList } from "@/lib/management/projects";
import {
  getPageParam,
  getSearchParamValue
} from "@/lib/management/search-params";
import { canWriteTenantInventory, routeAccess } from "@/lib/rbac";
import {
  projectInstallationStatusTone,
  projectPriorityTone
} from "@/lib/status";
import {
  projectInstallationStatusOptions,
  projectTypeOptions
} from "@/lib/validations/project";
import { formatDate, formatEnumLabel } from "@/lib/utils";

type ProjectsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ProjectsPage({
  searchParams = {}
}: ProjectsPageProps) {
  const user = await requireRoles(routeAccess.projects);
  const query = getSearchParamValue(searchParams.query);
  const organizationId = getSearchParamValue(searchParams.organizationId);
  const rawStatus = getSearchParamValue(searchParams.status);
  const rawProjectType = getSearchParamValue(searchParams.projectType);
  const page = getPageParam(searchParams.page);
  const status = projectInstallationStatusOptions.includes(
    rawStatus as ProjectInstallationStatus
  )
    ? (rawStatus as ProjectInstallationStatus)
    : "";
  const projectType = projectTypeOptions.includes(rawProjectType as ProjectType)
    ? (rawProjectType as ProjectType)
    : "";
  const results = await getProjectsList(user, {
    query,
    organizationId,
    status,
    projectType,
    page
  });
  const canWrite = canWriteTenantInventory(user.role);
  const baseParams = {
    query: query || undefined,
    organizationId: organizationId || undefined,
    status: status || undefined,
    projectType: projectType || undefined
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Projects"
        title="Project installations"
        description="Track real customer installations, upgrades, rollouts, and managed handoffs across tenant sites."
        breadcrumbs={[
          {
            label: "Command Center",
            href: "/dashboard"
          },
          {
            label: "Projects"
          }
        ]}
        actions={
          canWrite ? (
            <>
              <Button variant="outline" asChild>
                <Link href="/projects/new/wizard">
                  <Plus className="h-4 w-4" />
                  Project wizard
                </Link>
              </Button>
              <Button asChild>
                <Link href="/projects/new">
                  <Plus className="h-4 w-4" />
                  New project
                </Link>
              </Button>
            </>
          ) : null
        }
      />

      <FilterBar>
        <form className="grid gap-3 md:grid-cols-[1.5fr_220px_220px_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="query"
              defaultValue={query}
              placeholder="Search project, code, or owner"
              className="pl-9"
            />
          </div>
          <Select name="organizationId" defaultValue={organizationId || ""}>
            <option value="">All organizations</option>
            {results.organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </Select>
          <Select name="status" defaultValue={status || ""}>
            <option value="">All statuses</option>
            {projectInstallationStatusOptions.map((option) => (
              <option key={option} value={option}>
                {formatEnumLabel(option)}
              </option>
            ))}
          </Select>
          <Select name="projectType" defaultValue={projectType || ""}>
            <option value="">All types</option>
            {projectTypeOptions.map((option) => (
              <option key={option} value={option}>
                {formatEnumLabel(option)}
              </option>
            ))}
          </Select>
          <div className="flex gap-3">
            <Button type="submit" variant="outline">
              Apply filters
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/projects">Reset</Link>
            </Button>
          </div>
        </form>
      </FilterBar>

      <SummaryTable
        title="Installed project directory"
        description="Tenant-safe rollout and handoff records with linked site, device, and access-reference counts."
        headers={[
          "Project",
          "Status",
          "Priority",
          "Organization",
          "Linked sites",
          "Devices",
          "Access refs",
          "Updated",
          "Actions"
        ]}
        rowCount={results.projects.length}
        emptyTitle="No projects found"
        emptyDescription="Create the first installation record once a real deployment needs onboarding."
      >
        {results.projects.map((project) => (
          <tr key={project.id} className="align-top">
            <td className="px-4 py-4 sm:px-5">
              <div className="space-y-1">
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {project.name}
                </Link>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  {project.projectCode ?? "No project code"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatEnumLabel(project.projectType)}
                  {project.primarySite ? ` · ${project.primarySite.name}` : ""}
                </p>
              </div>
            </td>
            <td className="px-4 py-4 sm:px-5">
              <StatusBadge
                tone={projectInstallationStatusTone(project.status)}
                label={formatEnumLabel(project.status)}
              />
            </td>
            <td className="px-4 py-4 sm:px-5">
              <div className="space-y-2">
                <StatusBadge
                  tone={projectPriorityTone(project.priority)}
                  label={formatEnumLabel(project.priority)}
                />
                <p className="text-xs text-muted-foreground">
                  {project.monitoringReady ? "Monitoring ready" : "Monitoring pending"}
                </p>
              </div>
            </td>
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              {project.organization.name}
            </td>
            <td className="px-4 py-4 sm:px-5">{project._count.projectSites}</td>
            <td className="px-4 py-4 sm:px-5">{project._count.devices}</td>
            <td className="px-4 py-4 sm:px-5">{project._count.accessReferences}</td>
            <td className="px-4 py-4 text-muted-foreground sm:px-5">
              {formatDate(project.updatedAt)}
            </td>
            <td className="px-4 py-4 sm:px-5">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${project.id}`}>View</Link>
                </Button>
                {canWrite ? (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/projects/${project.id}/edit`}>Edit</Link>
                  </Button>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </SummaryTable>

      {results.totalCount > 0 ? (
        <PaginationControls
          page={page}
          totalPages={results.totalPages}
          totalCount={results.totalCount}
          pageSize={results.pageSize}
          prevHref={
            page > 1
              ? buildHref("/projects", baseParams, {
                  page: String(page - 1)
                })
              : undefined
          }
          nextHref={
            page < results.totalPages
              ? buildHref("/projects", baseParams, {
                  page: String(page + 1)
                })
              : undefined
          }
        />
      ) : (
        <EmptyState
          title="Project onboarding is ready"
          description="Create a project installation to represent a live deployment, rollout, or managed handoff."
          action={
            canWrite ? (
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" asChild>
                  <Link href="/projects/new/wizard">
                    <Plus className="h-4 w-4" />
                    Project wizard
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/projects/new">
                    <Plus className="h-4 w-4" />
                    New project
                  </Link>
                </Button>
              </div>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
