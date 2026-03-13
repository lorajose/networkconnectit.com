import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SiteForm } from "@/components/management/site-form";
import { requireUser } from "@/lib/auth";
import { getSiteForEdit, getSiteFormOptions } from "@/lib/management/sites";
import { requireInventoryWriteAccess } from "@/lib/management/tenant";

import { updateSiteAction } from "../../actions";

type EditSitePageProps = {
  params: {
    id: string;
  };
};

export default async function EditSitePage({ params }: EditSitePageProps) {
  const user = requireInventoryWriteAccess(await requireUser());
  const [site, options] = await Promise.all([
    getSiteForEdit(user, params.id),
    getSiteFormOptions(user)
  ]);

  if (!site) {
    notFound();
  }

  const action = updateSiteAction.bind(null, site.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sites"
        title={`Edit ${site.name}`}
        description="Update site metadata, location fields, and status. Organization ownership stays fixed after creation."
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
            label: site.name,
            href: `/sites/${site.id}`
          },
          {
            label: "Edit"
          }
        ]}
      />

      <SiteForm
        action={action}
        submitLabel="Save changes"
        organizations={options.organizations}
        lockOrganization
        initialValues={site}
      />
    </div>
  );
}
