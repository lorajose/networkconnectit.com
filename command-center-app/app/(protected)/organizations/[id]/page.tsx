import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, Mail, Phone, Plus } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { requireRoles } from "@/lib/auth";
import { getOrganizationDetail } from "@/lib/management/organizations";
import { canManageOrganizations, routeAccess } from "@/lib/rbac";
import { organizationStatusTone, siteStatusTone } from "@/lib/status";
import { formatDate, formatEnumLabel, formatLocation } from "@/lib/utils";

type OrganizationDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function OrganizationDetailPage({
  params
}: OrganizationDetailPageProps) {
  const user = await requireRoles(routeAccess.organizations);
  const organization = await getOrganizationDetail(user, params.id);

  if (!organization) {
    notFound();
  }

  const canManage = canManageOrganizations(user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organizations"
        title={organization.name}
        description="Tenant summary, related sites, and organization-level contact context."
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
            label: organization.name
          }
        ]}
        actions={
          canManage ? (
            <Button asChild>
              <Link href={`/organizations/${organization.id}/edit`}>Edit organization</Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-lg">
              <StatusBadge
                tone={organizationStatusTone(organization.status)}
                label={formatEnumLabel(organization.status)}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Created {formatDate(organization.createdAt)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sites</CardDescription>
            <CardTitle>{organization._count.sites}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Total operating locations in this tenant.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Devices</CardDescription>
            <CardTitle>{organization._count.devices}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Hardware records scoped to this organization.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Users</CardDescription>
            <CardTitle>{organization._count.users}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Authenticated users currently assigned to this tenant.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Organization details</CardTitle>
            <CardDescription>
              Core tenant identity and operational contact information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Slug
              </p>
              <p className="mt-1 font-medium text-foreground">{organization.slug}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Contact
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {organization.contactName ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Updated
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {formatDate(organization.updatedAt)}
                </p>
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-border/70 bg-background/30 px-4 py-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-sky-300" />
                <span>{organization.contactEmail ?? "No contact email set"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-sky-300" />
                <span>{organization.phone ?? "No phone number set"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-sky-300" />
                <span>{organization._count.sites} site records attached</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Related sites</CardTitle>
              <CardDescription>
                Direct site records within this organization.
              </CardDescription>
            </div>
            {canManage ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/sites/new">
                  <Plus className="h-4 w-4" />
                  Add site
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {organization.sites.length === 0 ? (
              <EmptyState
                title="No sites yet"
                description="Create the first site record to start scoping devices and map coverage."
              />
            ) : (
              <div className="space-y-3">
                {organization.sites.map((site) => (
                  <div
                    key={site.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/30 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <Link
                        href={`/sites/${site.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {site.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {formatLocation([site.city, site.country])}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <StatusBadge
                        tone={siteStatusTone(site.status)}
                        label={formatEnumLabel(site.status)}
                      />
                      <span className="text-muted-foreground">
                        {site._count.devices} devices
                      </span>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/sites/${site.id}`}>
                          View
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
