import { Camera, ClipboardCheck, MapPinned, Radio, ShieldCheck, Wifi } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requireRoles } from "@/lib/auth";
import { listSurveyAssignments } from "@/lib/contractor-os/site-survey-repository";
import { SURVEY_DISCIPLINES } from "@/lib/contractor-os/site-survey";
import { prisma } from "@/lib/db";
import { routeAccess } from "@/lib/rbac";
import { createSurveyAssignmentAction, startSurveySessionAction } from "./actions";

type Props = { searchParams?: { organizationId?: string } };
const labels: Record<(typeof SURVEY_DISCIPLINES)[number], string> = {
  CCTV: "CCTV", NETWORK: "Network / Wi-Fi", ACCESS_CONTROL: "Access Control",
  FIRE_ALARM: "Fire Alarm", AUDIO_AV: "Audio / AV", RADIO_WIRELESS: "Radio / Wireless",
};

export default async function SiteSurveysPage({ searchParams }: Props) {
  const user = await requireRoles(routeAccess.siteSurveys);
  const tenantOrganizationId = user.organizationId ?? null;
  const selectedOrganizationId = tenantOrganizationId || searchParams?.organizationId || "";
  const isGlobalAdmin = user.role === "SUPER_ADMIN" || user.role === "INTERNAL_ADMIN";
  const organizations = isGlobalAdmin
    ? await prisma.organization.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];
  const [assignments, projects, sites, technicians] = selectedOrganizationId
    ? await Promise.all([
        listSurveyAssignments({ role: user.role, organizationId: tenantOrganizationId }, selectedOrganizationId),
        prisma.projectInstallation.findMany({ where: { organizationId: selectedOrganizationId }, select: { id: true, name: true }, orderBy: { updatedAt: "desc" } }),
        prisma.site.findMany({ where: { organizationId: selectedOrganizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
        prisma.user.findMany({ where: { organizationId: selectedOrganizationId }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
      ])
    : [[], [], [], []];

  return <div className="space-y-6">
    <div className="space-y-2">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Contractor OS</p>
      <h1 className="text-3xl font-semibold tracking-tight">Site Survey Studio</h1>
      <p className="max-w-4xl text-muted-foreground">Assign guided field surveys and combine CCTV, network, access control, fire alarm, audio/AV and radio work in one site visit.</p>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader><ClipboardCheck className="h-5 w-5 text-primary"/><CardTitle className="text-lg">Guided checklist</CardTitle><CardDescription>Steps change automatically with the selected disciplines.</CardDescription></CardHeader></Card>
      <Card><CardHeader><Camera className="h-5 w-5 text-primary"/><CardTitle className="text-lg">Field capture</CardTitle><CardDescription>Foundation for camera photos, annotated points and equipment observations.</CardDescription></CardHeader></Card>
      <Card><CardHeader><MapPinned className="h-5 w-5 text-primary"/><CardTitle className="text-lg">Survey → Design</CardTitle><CardDescription>Survey evidence is structured for later handoff into Design Studio and takeoff.</CardDescription></CardHeader></Card>
    </div>

    {isGlobalAdmin ? <Card><CardHeader><CardTitle>Organization context</CardTitle></CardHeader><CardContent><form method="get" className="flex max-w-xl items-end gap-3"><div className="flex-1 space-y-2"><Label>Organization</Label><Select name="organizationId" defaultValue={selectedOrganizationId} required><option value="">Select organization</option>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</Select></div><Button type="submit">Load surveys</Button></form></CardContent></Card> : null}

    {selectedOrganizationId ? <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)]">
      <Card><CardHeader><CardTitle>Survey assignments</CardTitle><CardDescription>{assignments.length} survey assignment{assignments.length===1?"":"s"}.</CardDescription></CardHeader><CardContent className="space-y-3">
        {assignments.length===0 ? <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No site surveys assigned yet.</div> : assignments.map(a=><div key={a.id} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{a.title}</h2><p className="mt-1 text-sm text-muted-foreground">{a.projectName} · {a.siteName}</p><p className="mt-2 text-xs text-muted-foreground">{(JSON.parse(a.disciplinesJson) as string[]).map(d=>labels[d as keyof typeof labels]??d).join(" + ")}</p></div><span className="text-sm font-medium">{a.status}</span></div>{a.status==="ASSIGNED" ? <form action={startSurveySessionAction} className="mt-3"><input type="hidden" name="organizationId" value={selectedOrganizationId}/><input type="hidden" name="assignmentId" value={a.id}/><Button type="submit" size="sm">Start survey</Button></form>:null}</div>)}
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Create survey assignment</CardTitle><CardDescription>Select one or multiple systems for the same visit.</CardDescription></CardHeader><CardContent><form action={createSurveyAssignmentAction} className="space-y-4"><input type="hidden" name="organizationId" value={selectedOrganizationId}/>
        <div className="space-y-2"><Label>Survey title</Label><Input name="title" placeholder="Warehouse CCTV + Network Survey" required/></div>
        <div className="space-y-2"><Label>Project</Label><Select name="projectInstallationId" required><option value="">Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
        <div className="space-y-2"><Label>Site</Label><Select name="siteId" required><option value="">Select site</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
        <div className="space-y-2"><Label>Assigned technician</Label><Select name="assignedToUserId"><option value="">Unassigned</option>{technicians.map(t=><option key={t.id} value={t.id}>{t.name??t.email}</option>)}</Select></div>
        <fieldset className="space-y-2"><Label>Disciplines</Label><div className="grid gap-2 sm:grid-cols-2">{SURVEY_DISCIPLINES.map(d=><label key={d} className="flex items-center gap-2 rounded-xl border p-3 text-sm"><input type="checkbox" name="disciplines" value={d}/>{d==="CCTV"?<Camera className="h-4 w-4"/>:d==="NETWORK"?<Wifi className="h-4 w-4"/>:d==="RADIO_WIRELESS"?<Radio className="h-4 w-4"/>:<ShieldCheck className="h-4 w-4"/>}{labels[d]}</label>)}</div></fieldset>
        <div className="space-y-2"><Label>Technician instructions</Label><Input name="instructions" placeholder="Meet site contact at loading dock..."/></div>
        <Button type="submit" className="w-full">Assign site survey</Button>
      </form></CardContent></Card>
    </div> : null}
  </div>;
}
