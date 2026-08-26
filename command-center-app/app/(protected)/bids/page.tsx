import { ClipboardList, FileStack, Link2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireRoles } from "@/lib/auth";
import { listBidWorkspaces } from "@/lib/contractor-os/bid-repository";
import { prisma } from "@/lib/db";
import { routeAccess } from "@/lib/rbac";
import { createBidAction } from "./actions";

const intakeStages = [
  {
    title: "Bid package",
    description: "Capture bid identity, due date, revision, notes, and the customer/project context.",
    icon: ClipboardList,
  },
  {
    title: "Source documents",
    description: "Classify drawings, specifications, scope, addenda, and vendor/subcontractor quotes.",
    icon: FileStack,
  },
  {
    title: "Estimate linkage",
    description: "Preserve the exact source package that feeds the deterministic estimate and proposal workflow.",
    icon: Link2,
  },
] as const;

type BidsPageProps = {
  searchParams?: {
    organizationId?: string;
  };
};

function formatDueDate(value: Date | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function BidsPage({ searchParams }: BidsPageProps) {
  const user = await requireRoles(routeAccess.bids);
  const tenantOrganizationId = user.organizationId ?? null;
  const selectedOrganizationId = tenantOrganizationId || searchParams?.organizationId || "";
  const isGlobalAdmin = user.role === "SUPER_ADMIN" || user.role === "INTERNAL_ADMIN";

  const organizations = isGlobalAdmin
    ? await prisma.organization.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const bids = selectedOrganizationId
    ? await listBidWorkspaces(
        { role: user.role, organizationId: tenantOrganizationId },
        selectedOrganizationId,
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Contractor OS</p>
        <h1 className="text-3xl font-semibold tracking-tight">Estimating Workspace</h1>
        <p className="max-w-3xl text-muted-foreground">
          Organize bid packages before takeoff and pricing so each estimate stays traceable to its drawings,
          specifications, revisions, and commercial evidence.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
            <div>
              <CardTitle>Tenant-safe bid intake</CardTitle>
              <CardDescription>
                Bid records reuse Organization, ProjectInstallation, and Estimate instead of creating a parallel customer/project domain.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isGlobalAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Organization context</CardTitle>
            <CardDescription>Select the tenant whose bid workspace you want to manage.</CardDescription>
          </CardHeader>
          <CardContent>
            <form method="get" className="flex max-w-xl items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="organization-filter">Organization</Label>
                <Select id="organization-filter" name="organizationId" defaultValue={selectedOrganizationId} required>
                  <option value="">Select organization</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit">Load bids</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {selectedOrganizationId ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Active bid packages</CardTitle>
              <CardDescription>{bids.length} bid workspace{bids.length === 1 ? "" : "s"} in this organization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {bids.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                  No bid packages yet. Create the first one using the intake form.
                </div>
              ) : (
                bids.map((bid) => (
                  <div key={bid.id} className="rounded-2xl border border-border/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-primary">{bid.bidNumber}</p>
                        <h2 className="text-lg font-semibold">{bid.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {bid.revision ? `Revision ${bid.revision} · ` : ""}{formatDueDate(bid.bidDueAt)}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">{bid.status.replaceAll("_", " ")}</p>
                        <p className="text-muted-foreground">{bid.documentCount.toString()} documents</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create bid package</CardTitle>
              <CardDescription>Start a traceable commercial workspace before takeoff and estimating.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createBidAction} className="space-y-4">
                <input type="hidden" name="organizationId" value={selectedOrganizationId} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bidNumber">Bid number</Label>
                    <Input id="bidNumber" name="bidNumber" placeholder="BID-2026-001" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="revision">Revision</Label>
                    <Input id="revision" name="revision" placeholder="Rev 1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Bid title</Label>
                  <Input id="title" name="title" placeholder="Hospital CCTV & Access Control" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bidDueAt">Bid due</Label>
                  <Input id="bidDueAt" name="bidDueAt" type="datetime-local" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectInstallationId">Existing project ID (optional)</Label>
                  <Input id="projectInstallationId" name="projectInstallationId" placeholder="Link existing ProjectInstallation" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimateId">Existing estimate ID (optional)</Label>
                  <Input id="estimateId" name="estimateId" placeholder="Link existing Estimate" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" placeholder="Addenda, exclusions, customer instructions, pre-bid notes..." />
                </div>
                <Button type="submit" className="w-full">Create bid workspace</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Select an organization to begin managing its bid packages.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {intakeStages.map((stage) => {
          const Icon = stage.icon;
          return (
            <Card key={stage.title}>
              <CardHeader>
                <Icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{stage.title}</CardTitle>
                <CardDescription>{stage.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
