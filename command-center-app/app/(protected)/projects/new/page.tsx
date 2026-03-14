import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/management/project-form";
import { requireUser } from "@/lib/auth";
import { getProjectFormOptions } from "@/lib/management/projects";
import {
  isGlobalAccessUser,
  requireInventoryWriteAccess
} from "@/lib/management/tenant";

import { createProjectAction } from "../actions";

export default async function NewProjectPage() {
  const user = requireInventoryWriteAccess(await requireUser());
  const options = await getProjectFormOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Projects"
        title="Create project installation"
        description="Add a real installation, refresh, rollout, or managed handoff for one or more existing sites."
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
            label: "New"
          }
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/projects/new/wizard">Use Project Wizard</Link>
          </Button>
        }
      />

      <ProjectForm
        action={createProjectAction}
        submitLabel="Create project"
        organizations={options.organizations}
        sites={options.sites}
        lockOrganization={!isGlobalAccessUser(user)}
        initialValues={{
          organizationId: user.organizationId
        }}
      />
    </div>
  );
}
