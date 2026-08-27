import Link from "next/link";
import { AlertTriangle, CheckCircle2, SearchCheck, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireRoles } from "@/lib/auth";
import {
  getScopeRiskRun,
  listAcceptedProposalFindings,
  listScopeRiskRuns,
} from "@/lib/contractor-os/scope-risk-repository";
import { prisma } from "@/lib/db";
import { routeAccess } from "@/lib/rbac";
import { decideScopeRiskFindingAction, runScopeRiskAnalysisAction } from "./actions";

type PageProps = { searchParams?: { organizationId?: string; runId?: string } };

export default async function ScopeRisksPage({ searchParams }: PageProps) {
  const user = await requireRoles(routeAccess.scopeRisks);
  const tenantOrganizationId = user.organizationId ?? null;
  const selectedOrganizationId = tenantOrganizationId || searchParams?.organizationId || "";
  const selectedRunId = searchParams?.runId || "";
  const isGlobalAdmin = user.role === "SUPER_ADMIN" || user.role === "INTERNAL_ADMIN";
  const actor = { role: user.role, organizationId: tenantOrganizationId };

  const organizations = isGlobalAdmin
    ? await prisma.organization.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];
  const runs = selectedOrganizationId ? await listScopeRiskRuns(actor, selectedOrganizationId) : [];
  const selected = selectedOrganizationId && selectedRunId
    ? await getScopeRiskRun(actor, selectedRunId, selectedOrganizationId)
    : null;
  const accepted = selected
    ? await listAcceptedProposalFindings(actor, selectedOrganizationId, selected.run.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Contractor OS</p>
        <h1 className="text-3xl font-semibold tracking-tight">Scope Gap & Risk Analyzer</h1>
        <p className="max-w-3xl text-muted-foreground">Compare commercial source data, surface scope gaps and assumptions, and require an explicit human decision before any finding can feed a proposal.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><SearchCheck className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Cross-source review</CardTitle><CardDescription>Bid, takeoff, estimate, and project notes are evaluated together.</CardDescription></CardHeader></Card>
        <Card><CardHeader><ShieldAlert className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Advisory only</CardTitle><CardDescription>No quantity, unit cost, price, or takeoff count is changed automatically.</CardDescription></CardHeader></Card>
        <Card><CardHeader><CheckCircle2 className="h-5 w-5 text-primary" /><CardTitle className="text-lg">Human audit trail</CardTitle><CardDescription>Accepted and dismissed findings record the authenticated reviewer.</CardDescription></CardHeader></Card>
      </div>

      {isGlobalAdmin ? (
        <Card><CardHeader><CardTitle className="text-lg">Organization context</CardTitle><CardDescription>Select the tenant whose risk reviews you want to manage.</CardDescription></CardHeader><CardContent><form method="get" className="flex max-w-xl items-end gap-3"><div className="flex-1 space-y-2"><Label htmlFor="organization-filter">Organization</Label><Select id="organization-filter" name="organizationId" defaultValue={selectedOrganizationId} required><option value="">Select organization</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</Select></div><Button type="submit">Load reviews</Button></form></CardContent></Card>
      ) : null}

      {selectedOrganizationId ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)]">
          <div className="space-y-6">
            <Card><CardHeader><AlertTriangle className="h-5 w-5 text-primary" /><CardTitle>Run analysis</CardTitle><CardDescription>Provide one or more linked commercial records. IDs are tenant-validated before analysis.</CardDescription></CardHeader><CardContent><form action={runScopeRiskAnalysisAction} className="space-y-4"><input type="hidden" name="organizationId" value={selectedOrganizationId} /><div className="space-y-2"><Label htmlFor="bidWorkspaceId">Bid workspace ID</Label><Input id="bidWorkspaceId" name="bidWorkspaceId" placeholder="Optional" /></div><div className="space-y-2"><Label htmlFor="takeoffWorkspaceId">Takeoff workspace ID</Label><Input id="takeoffWorkspaceId" name="takeoffWorkspaceId" placeholder="Optional" /></div><div className="space-y-2"><Label htmlFor="estimateId">Estimate ID</Label><Input id="estimateId" name="estimateId" placeholder="Optional" /></div><div className="space-y-2"><Label htmlFor="projectInstallationId">Project ID</Label><Input id="projectInstallationId" name="projectInstallationId" placeholder="Optional" /></div><Button type="submit" className="w-full">Run scope & risk analysis</Button></form></CardContent></Card>

            <Card><CardHeader><CardTitle>Analysis history</CardTitle><CardDescription>{runs.length} immutable analysis run{runs.length === 1 ? "" : "s"}.</CardDescription></CardHeader><CardContent className="space-y-2">{runs.length === 0 ? <p className="text-sm text-muted-foreground">No analysis runs yet.</p> : runs.map((run) => <Link key={run.id} href={`/scope-risks?organizationId=${encodeURIComponent(selectedOrganizationId)}&runId=${encodeURIComponent(run.id)}`} className="block rounded-xl border p-3 hover:bg-muted/30"><div className="flex justify-between gap-3"><div><p className="font-medium">{run.createdAt.toLocaleString()}</p><p className="text-xs text-muted-foreground">{run.inputHash.slice(0, 16)}…</p></div><p className="text-sm">{run.status}</p></div></Link>)}</CardContent></Card>
          </div>

          <Card><CardHeader><CardTitle>Review findings</CardTitle><CardDescription>{selected ? `${selected.findings.length} finding${selected.findings.length === 1 ? "" : "s"} in this run.` : "Select an analysis run to review findings."}</CardDescription></CardHeader><CardContent className="space-y-4">
            {!selected ? <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">Run an analysis or select one from history.</div> : selected.findings.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No gaps or risks were detected from the linked sources.</div> : selected.findings.map((finding) => (
              <div key={finding.id} className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{finding.severity} · {finding.findingType}</p><h2 className="mt-1 font-semibold">{finding.title}</h2></div><span className="rounded-full border px-2.5 py-1 text-xs font-medium">{finding.status}</span></div>
                <p className="mt-3 text-sm text-muted-foreground">{finding.detail}</p>
                <p className="mt-2 text-xs text-muted-foreground">Proposal section: {finding.proposalSection || "Advisory only"}</p>
                <form action={decideScopeRiskFindingAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]"><input type="hidden" name="organizationId" value={selectedOrganizationId} /><input type="hidden" name="runId" value={selected.run.id} /><input type="hidden" name="findingId" value={finding.id} /><Textarea name="note" placeholder="Decision note (optional)" className="min-h-10" /><Button name="decision" value="ACCEPTED" type="submit" variant="default">Accept</Button><Button name="decision" value="DISMISSED" type="submit" variant="outline">Dismiss</Button></form>
              </div>
            ))}

            {selected ? <div className="rounded-2xl bg-muted/40 p-4"><p className="font-medium">Proposal handoff</p><p className="mt-1 text-sm text-muted-foreground">{accepted.length} accepted finding{accepted.length === 1 ? "" : "s"} currently eligible for proposal scope/exclusions/alternates/assumptions/risks.</p>{accepted.length > 0 ? <ul className="mt-3 space-y-1 text-sm">{accepted.map((item) => <li key={item.id}>• {item.proposalSection}: {item.title}</li>)}</ul> : null}</div> : null}
          </CardContent></Card>
        </div>
      ) : <Card><CardContent className="pt-6 text-sm text-muted-foreground">Select an organization to begin reviewing commercial scope risk.</CardContent></Card>}
    </div>
  );
}
