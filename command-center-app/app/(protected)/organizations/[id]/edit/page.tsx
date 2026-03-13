import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { OrganizationForm } from "@/components/management/organization-form";
import { requireUser } from "@/lib/auth";
import { getOrganizationForEdit } from "@/lib/management/organizations";
import { requireOrganizationManagementAccess } from "@/lib/management/tenant";

import { updateOrganizationAction } from "../../actions";

type EditOrganizationPageProps = {
  params: {
    id: string;
  };
};

export default async function EditOrganizationPage({
  params
}: EditOrganizationPageProps) {
  const user = requireOrganizationManagementAccess(await requireUser());
  const organization = await getOrganizationForEdit(user, params.id);

  if (!organization) {
    notFound();
  }

  const action = updateOrganizationAction.bind(null, organization.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organizations"
        title={`Edit ${organization.name}`}
        description="Update the tenant identity and primary operational contact."
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
            label: organization.name,
            href: `/organizations/${organization.id}`
          },
          {
            label: "Edit"
          }
        ]}
      />

      <OrganizationForm
        action={action}
        submitLabel="Save changes"
        initialValues={organization}
      />
    </div>
  );
}
