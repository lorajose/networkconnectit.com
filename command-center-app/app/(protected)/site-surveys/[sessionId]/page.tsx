import { notFound } from "next/navigation";
import { Camera, CheckCircle2, MapPin, Plus, RadioTower } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireRoles } from "@/lib/auth";
import { getSurveySessionWorkspace } from "@/lib/contractor-os/site-survey-repository";
import { SURVEY_DISCIPLINES, type SurveyChecklistSection } from "@/lib/contractor-os/site-survey";
import { routeAccess } from "@/lib/rbac";
import { completeSurveySessionAction, createSurveyAreaAction, createSurveyPointAction, updateSurveyChecklistAction, uploadSurveyPhotoAction } from "../actions";

type Props={params:{sessionId:string};searchParams?:{organizationId?:string}};
const labels:Record<string,string>={CCTV:"CCTV",NETWORK:"Network / Wi-Fi",ACCESS_CONTROL:"Access Control",FIRE_ALARM:"Fire Alarm",AUDIO_AV:"Audio / AV",RADIO_WIRELESS:"Radio / Wireless"};

export default async function SurveySessionPage({params,searchParams}:Props){
  const user=await requireRoles(routeAccess.siteSurveys);
  const organizationId=user.organizationId??searchParams?.organizationId??"";
  if(!organizationId)notFound();
  const workspace=await getSurveySessionWorkspace({role:user.role,organizationId:user.organizationId},params.sessionId,organizationId);
  if(!workspace)notFound();
  const checklist=JSON.parse(workspace.session.checklistSnapshotJson) as SurveyChecklistSection[];
  const responseMap=new Map(workspace.responses.map(r=>[r.itemKey,r]));
  const total=checklist.flatMap(s=>s.items).length,completed=workspace.responses.filter(r=>r.status!=="PENDING").length;
  const disciplines=JSON.parse(workspace.assignment.disciplinesJson) as string[];

  return <div className="space-y-6 pb-24">
    <div className="space-y-2"><p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Field Survey</p><h1 className="text-3xl font-semibold tracking-tight">{workspace.assignment.title}</h1><p className="text-muted-foreground">{workspace.assignment.projectName} · {workspace.assignment.siteName}</p><div className="flex flex-wrap gap-2 text-xs">{disciplines.map(d=><span key={d} className="rounded-full border px-3 py-1">{labels[d]??d}</span>)}</div></div>
    <Card><CardContent className="pt-6"><div className="flex items-center justify-between gap-4"><div><p className="font-medium">Survey progress</p><p className="text-sm text-muted-foreground">{completed} of {total} checklist items recorded</p></div><span className="text-2xl font-semibold">{total?Math.round(completed/total*100):0}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{width:`${total?completed/total*100:0}%`}}/></div></CardContent></Card>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">{checklist.map(section=><Card key={section.key}><CardHeader><CardTitle className="text-lg">{section.title}</CardTitle></CardHeader><CardContent className="space-y-4">{section.items.map(item=>{const response=responseMap.get(item.key);return <form key={item.key} action={updateSurveyChecklistAction} className="rounded-2xl border p-4"><input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="sessionId" value={params.sessionId}/><input type="hidden" name="itemKey" value={item.key}/><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.label}{item.required?<span className="ml-1 text-primary">*</span>:null}</p>{item.helpText?<p className="text-sm text-muted-foreground">{item.helpText}</p>:null}</div>{response?.status&&response.status!=="PENDING"?<CheckCircle2 className="h-5 w-5 text-primary"/>:null}</div><div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr_auto]"><Select name="status" defaultValue={response?.status??"PENDING"}><option value="PENDING">Pending</option><option value="PASS">Complete / Pass</option><option value="FAIL">Issue / Fail</option><option value="NA">N/A</option></Select><Input name="notes" defaultValue={response?.notes??""} placeholder="Field notes..."/><Button type="submit" variant="outline">Save</Button></div></form>})}</CardContent></Card>)}</div>

      <div className="space-y-5">
        <Card><CardHeader><Camera className="h-5 w-5 text-primary"/><CardTitle>Site photos</CardTitle><CardDescription>On mobile, Take photo opens the device camera when supported.</CardDescription></CardHeader><CardContent><form action={uploadSurveyPhotoAction} className="space-y-3"><input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="sessionId" value={params.sessionId}/><Select name="areaId"><option value="">No area selected</option>{workspace.areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select><Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required/><Button className="w-full" type="submit"><Camera className="mr-2 h-4 w-4"/>Take / upload photo</Button></form><p className="mt-3 text-xs text-muted-foreground">{workspace.assets.length} photo{workspace.assets.length===1?"":"s"} captured.</p></CardContent></Card>

        <Card><CardHeader><MapPin className="h-5 w-5 text-primary"/><CardTitle>Areas / rooms</CardTitle></CardHeader><CardContent className="space-y-3"><div className="space-y-2">{workspace.areas.map(a=><div key={a.id} className="rounded-xl border px-3 py-2 text-sm">{a.name} <span className="text-muted-foreground">· {a.areaType}</span></div>)}</div><form action={createSurveyAreaAction} className="space-y-2"><input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="sessionId" value={params.sessionId}/><Input name="name" placeholder="Level 1 / IDF / Lobby" required/><Select name="areaType" defaultValue="AREA"><option value="BUILDING">Building</option><option value="FLOOR">Floor</option><option value="ROOM">Room</option><option value="AREA">Area</option></Select><Button type="submit" variant="outline" className="w-full"><Plus className="mr-2 h-4 w-4"/>Add area</Button></form></CardContent></Card>

        <Card><CardHeader><RadioTower className="h-5 w-5 text-primary"/><CardTitle>Equipment / survey point</CardTitle><CardDescription>Record existing or proposed devices now; photo-coordinate annotation comes next.</CardDescription></CardHeader><CardContent><form action={createSurveyPointAction} className="space-y-3"><input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="sessionId" value={params.sessionId}/><Select name="discipline" required>{SURVEY_DISCIPLINES.filter(d=>disciplines.includes(d)).map(d=><option key={d} value={d}>{labels[d]}</option>)}</Select><Select name="areaId"><option value="">No area</option>{workspace.areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select><Select name="assetId"><option value="">No photo</option>{workspace.assets.map(a=><option key={a.id} value={a.id}>{a.originalName}</option>)}</Select><Input name="pointType" placeholder="Camera, AP, switch, door, reader..." required/><Input name="label" placeholder="Label / ID (CAM-01)"/><Select name="lifecycle" defaultValue="PROPOSED"><option value="PROPOSED">Proposed</option><option value="EXISTING">Existing</option></Select><Textarea name="notes" placeholder="Mounting, pathway, power, condition..."/><Button type="submit" className="w-full">Add survey point</Button></form><p className="mt-3 text-xs text-muted-foreground">{workspace.points.length} point{workspace.points.length===1?"":"s"} recorded.</p></CardContent></Card>
      </div>
    </div>

    <Card className="border-primary/30"><CardHeader><CardTitle>Finish field survey</CardTitle><CardDescription>Required checklist items must be recorded before completion. Issues can be marked Fail and preserved for review.</CardDescription></CardHeader><CardContent><form action={completeSurveySessionAction}><input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="sessionId" value={params.sessionId}/><Button type="submit">Complete survey</Button></form></CardContent></Card>
  </div>;
}
