import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/management/project-form";
import { requireUser } from "@/lib/auth";
import {
  getProjectFormOptions,
  getProjectForEdit
} from "@/lib/management/projects";
import {
  isGlobalAccessUser,
  requireInventoryWriteAccess
} from "@/lib/management/tenant";

import { updateProjectAction } from "../../actions";

type EditProjectPageProps = {
  params: {
    id: string;
  };
};

export default async function EditProjectPage({
  params
}: EditProjectPageProps) {
  const user = requireInventoryWriteAccess(await requireUser());
  const [project, options] = await Promise.all([
    getProjectForEdit(user, params.id),
    getProjectFormOptions(user)
  ]);

  if (!project) {
    notFound();
  }

  const action = updateProjectAction.bind(null, project.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Projects"
        title={`Edit ${project.name}`}
        description="Update project scope, linked sites, dates, and handoff readiness."
        breadcrumbs={[
          {
            label: "Command Center",
            href: "/dashboard"
          },
          {
            label: "Projects",
            href: "/projects"
          },
          {
            label: project.name,
            href: `/projects/${project.id}`
          },
          {
            label: "Edit"
          }
        ]}
      />

      <ProjectForm
        action={action}
        submitLabel="Save changes"
        organizations={options.organizations}
        sites={options.sites}
        lockOrganization={!isGlobalAccessUser(user)}
        initialValues={{
          ...project,
          siteIds: project.projectSites.map((projectSite) => projectSite.siteId)
        }}
      />
    </div>
  );
}
