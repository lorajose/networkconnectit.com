import { PageHeader } from "@/components/page-header";
import { SiteForm } from "@/components/management/site-form";
import { requireUser } from "@/lib/auth";
import { getSiteFormOptions } from "@/lib/management/sites";
import { isGlobalAccessUser, requireInventoryWriteAccess } from "@/lib/management/tenant";

import { createSiteAction } from "../actions";

export default async function NewSitePage() {
  const user = requireInventoryWriteAccess(await requireUser());
  const options = await getSiteFormOptions(user);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sites"
        title="Create site"
        description="Add a new operating location inside an accessible organization."
        breadcrumbs={[
          {
            label: "Command Center",
            href: "/dashboard"
          },
          {
            label: "Sites",
            href: "/sites"
          },
          {
            label: "New"
          }
        ]}
      />

      <SiteForm
        action={createSiteAction}
        submitLabel="Create site"
        organizations={options.organizations}
        lockOrganization={!isGlobalAccessUser(user)}
        initialValues={{
          organizationId:
            user.organizationId ?? options.organizations[0]?.id ?? null,
          status: "ACTIVE"
        }}
      />
    </div>
  );
}
