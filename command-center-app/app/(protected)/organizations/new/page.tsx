import { PageHeader } from "@/components/page-header";
import { OrganizationForm } from "@/components/management/organization-form";
import { requireRoles } from "@/lib/auth";

import { createOrganizationAction } from "../actions";

export default async function NewOrganizationPage() {
  await requireRoles(["SUPER_ADMIN", "INTERNAL_ADMIN"] as const);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organizations"
        title="Create organization"
        description="Add a new tenant record for an internal business unit or client account."
        breadcrumbs={[
          {
            label: "Command Center",
            href: "/dashboard"
          },
          {
            label: "Organizations",
            href: "/organizations"
          },
          {
            label: "New"
          }
        ]}
      />

      <OrganizationForm action={createOrganizationAction} submitLabel="Create organization" />
    </div>
  );
}
