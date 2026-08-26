import Link from "next/link";
import { ClipboardCheck, Layers3, Ruler, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireRoles } from "@/lib/auth";
import { listTakeoffWorkspaces } from "@/lib/contractor-os/takeoff-repository";
import { prisma } from "@/lib/db";
import { routeAccess } from "@/lib/rbac";
import { createTakeoffWorkspaceAction } from "./actions";

type TakeoffsPageProps = { searchParams?: { organizationId?: string } };

export default async function TakeoffsPage({ searchParams }: TakeoffsPageProps) {
  const user = await requireRoles(routeAccess.takeoffs);
  const tenantOrganizationId = user.organizationId ?? null;
  const selectedOrganizationId = tenantOrganizationId || searchParams?.organizationId || "";
  const isGlobalAdmin = user.role === "SUPER_ADMIN" || user.role === "INTERNAL_ADMIN";
  const organizations = isGlobalAdmin
    ? await prisma.organization.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];
  const workspaces = selectedOrganizationId
    ? await listTakeoffWorkspaces({ role: user.role, organizationId: tenantOrganizationId }, selectedOrganizationId)
    : [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Contractor OS</p>
        <h1 className="text-3xl font-semibold tracking-tight">Digital Takeoff Workspace</h1>
        <p className="max-w-3xl text-muted-foreground">Count drawing scope, retain sheet evidence, apply human overrides, and turn approved quantities into an editable bill of materials before pricing.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><Ruler className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Manual-assisted counts</CardTitle><CardDescription>Structured cabling, fiber, CCTV, access control, Wi-Fi, pathways and equipment.</CardDescription></CardHeader></Card>
        <Card><CardHeader><Layers3 className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Editable BOM</CardTitle><CardDescription>Every generated quantity can be overridden before it reaches estimating.</CardDescription></CardHeader></Card>
        <Card><CardHeader><ShieldCheck className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Human authority</CardTitle><CardDescription>Future AI can suggest counts, but the contractor remains the source of truth.</CardDescription></CardHeader></Card>
      </div>

      {isGlobalAdmin ? (
        <Card><CardHeader><CardTitle className="text-lg">Organization context</CardTitle><CardDescription>Select the tenant whose takeoff workspace you want to manage.</CardDescription></CardHeader><CardContent><form method="get" className="flex max-w-xl items-end gap-3"><div className="flex-1 space-y-2"><Label htmlFor="organization-filter">Organization</Label><Select id="organization-filter" name="organizationId" defaultValue={selectedOrganizationId} required><option value="">Select organization</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</Select></div><Button type="submit">Load takeoffs</Button></form></CardContent></Card>
      ) : null}

      {selectedOrganizationId ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <Card><CardHeader><CardTitle>Takeoff workspaces</CardTitle><CardDescription>{workspaces.length} workspace{workspaces.length === 1 ? "" : "s"} in this organization.</CardDescription></CardHeader><CardContent className="space-y-3">
            {workspaces.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No takeoffs yet. Create one from a bid package or start a standalone takeoff.</div> : workspaces.map((workspace) => (
              <Link key={workspace.id} href={`/takeoffs/${workspace.id}?organizationId=${encodeURIComponent(selectedOrganizationId)}`} className="block rounded-2xl border border-border/70 p-4 transition hover:border-primary/50 hover:bg-muted/30">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{workspace.name}</h2><p className="mt-1 text-sm text-muted-foreground">{workspace.bidWorkspaceId ? `Bid ${workspace.bidWorkspaceId}` : "Standalone"}{workspace.estimateId ? ` · Estimate ${workspace.estimateId}` : ""}</p></div><div className="text-right text-sm"><p className="font-medium">{workspace.status}</p><p className="text-muted-foreground">{workspace.itemCount.toString()} items</p></div></div>
              </Link>
            ))}
          </CardContent></Card>

          <Card><CardHeader><ClipboardCheck className="h-5 w-5 text-primary" /><CardTitle>Create takeoff</CardTitle><CardDescription>Link to an existing bid or estimate when available so pricing remains traceable.</CardDescription></CardHeader><CardContent><form action={createTakeoffWorkspaceAction} className="space-y-4"><input type="hidden" name="organizationId" value={selectedOrganizationId} /><div className="space-y-2"><Label htmlFor="name">Takeoff name</Label><Input id="name" name="name" placeholder="Floor 2 Security & Cabling" required /></div><div className="space-y-2"><Label htmlFor="bidWorkspaceId">Bid workspace ID (optional)</Label><Input id="bidWorkspaceId" name="bidWorkspaceId" placeholder="Link BidWorkspace" /></div><div className="space-y-2"><Label htmlFor="estimateId">Estimate ID (optional)</Label><Input id="estimateId" name="estimateId" placeholder="Link Estimate" /></div><div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" placeholder="Drawing set, scope assumptions, takeoff instructions..." /></div><Button type="submit" className="w-full">Create takeoff workspace</Button></form></CardContent></Card>
        </div>
      ) : <Card><CardContent className="pt-6 text-sm text-muted-foreground">Select an organization to begin managing takeoffs.</CardContent></Card>}
    </div>
  );
}
