import Link from "next/link";

import { ProjectWizard } from "@/components/management/project-wizard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getProjectWizardBootstrap } from "@/lib/management/project-wizard";
import { requireInventoryWriteAccess } from "@/lib/management/tenant";

export default async function NewProjectWizardPage() {
  const user = requireInventoryWriteAccess(await requireUser());
  const bootstrap = await getProjectWizardBootstrap(user);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Projects"
        title="New Project Wizard"
        description="Guide an internal operator through customer selection, site setup, network profiling, infrastructure registration, mapping, access documentation, and final readiness review."
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
            label: "New",
            href: "/projects/new"
          },
          {
            label: "Wizard"
          }
        ]}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/projects/new">Quick form</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/projects">Back to projects</Link>
            </Button>
          </>
        }
      />

      <ProjectWizard
        organizations={bootstrap.organizations}
        sites={bootstrap.sites}
        canCreateOrganizations={bootstrap.canCreateOrganizations}
        lockOrganizationId={bootstrap.lockOrganizationId}
      />
    </div>
  );
}
