import { PageHeader } from "@/components/page-header";
import { OrganizationProfileForm } from "@/components/settings/organization-profile-form";
import { requireRoles } from "@/lib/auth";
import { organizationProfileAccess } from "@/lib/contractor-os/organization-profile-access";
import { getOrganizationForEdit, getOrganizationOptions } from "@/lib/management/organizations";
import { routeAccess } from "@/lib/rbac";
import { updateOrganizationProfileAction } from "./actions";

type SettingsPageProps = { searchParams?: Record<string, string | string[] | undefined> };

export default async function SettingsPage({ searchParams = {} }: SettingsPageProps) {
  const user = await requireRoles(routeAccess.settings);
  const requested = typeof searchParams.organizationId === "string" ? searchParams.organizationId : undefined;
  const options = await getOrganizationOptions(user);
  const organizationId = requested || user.organizationId || options[0]?.id;
  if (!organizationId) return <PageHeader eyebrow="Settings" title="Organization profile" description="Create an organization before configuring company profile and branding." />;
  const access = organizationProfileAccess({ role: user.role, organizationId: user.organizationId }, organizationId);
  const organization = await getOrganizationForEdit(user, access.organizationId);
  if (!organization) return <PageHeader eyebrow="Settings" title="Organization profile unavailable" description="The selected organization is outside your tenant scope." />;
  const action = updateOrganizationProfileAction.bind(null, organization.id);

  return <div className="space-y-6">
    <PageHeader eyebrow="Settings" title="Company profile & branding" description="Set the organization identity and brand defaults that Contractor OS can reuse across commercial and closeout documents." breadcrumbs={[{ label: "Command Center", href: "/dashboard" }, { label: "Settings" }]} />
    <OrganizationProfileForm action={action} initialValues={organization as unknown as Record<string, string | null | undefined>} />
  </div>;
}
