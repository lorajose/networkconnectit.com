"use client";
import { useState } from "react";
import { Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props={organizationId:string;sessionId:string;draftId:string;areas:Array<{id:string;name:string}>;measurements:Array<{id:string;label:string;value:number;unit:string;measurementType:string}>;action:(data:FormData)=>void|Promise<void>};

export function SurveyMeasurementTool({organizationId,sessionId,draftId,areas,measurements,action}:Props){
 const [start,setStart]=useState<{x:number;y:number}|null>(null);const [end,setEnd]=useState<{x:number;y:number}|null>(null);
 function tap(e:React.MouseEvent<HTMLDivElement>){const r=e.currentTarget.getBoundingClientRect(),p={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};if(!start){setStart(p);setEnd(null)}else setEnd(p)}
 return <div className="space-y-4">
  <div onClick={tap} className="relative aspect-[4/3] overflow-hidden rounded-2xl border" style={{backgroundImage:"linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",backgroundSize:"24px 24px"}}>
   {start?<span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" style={{left:`${start.x*100}%`,top:`${start.y*100}%`}}/>:null}
   {end?<><span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" style={{left:`${end.x*100}%`,top:`${end.y*100}%`}}/><svg className="absolute inset-0 h-full w-full"><line x1={`${(start?.x??0)*100}%`} y1={`${(start?.y??0)*100}%`} x2={`${end.x*100}%`} y2={`${end.y*100}%`} stroke="currentColor" strokeWidth="2" strokeDasharray="6 4"/></svg></>:null}
  </div>
  <p className="text-xs text-muted-foreground">Tap the start and end of a measured wall/path, then enter the real field measurement. This anchors field evidence to the floor-plan draft.</p>
  <form action={action} className="grid gap-3"><input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="sessionId" value={sessionId}/><input type="hidden" name="floorPlanDraftId" value={draftId}/><input type="hidden" name="startX" value={start?.x??""}/><input type="hidden" name="startY" value={start?.y??""}/><input type="hidden" name="endX" value={end?.x??""}/><input type="hidden" name="endY" value={end?.y??""}/>
   <Input name="label" placeholder="North wall / ceiling / cable pathway" required/><div className="grid grid-cols-2 gap-2"><Select name="measurementType" defaultValue="DISTANCE"><option value="DISTANCE">Distance</option><option value="HEIGHT">Height</option><option value="CEILING_HEIGHT">Ceiling height</option><option value="PATHWAY">Cable pathway</option></Select><Select name="areaId"><option value="">Whole floor / no area</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select></div><div className="grid grid-cols-[1fr_110px] gap-2"><Input name="measurementValue" inputMode="decimal" type="number" min="0.001" step="0.001" placeholder="Measurement" required/><Select name="unit" defaultValue="FT"><option value="FT">ft</option><option value="IN">in</option><option value="M">m</option><option value="CM">cm</option></Select></div><Textarea name="notes" placeholder="Laser measurement, pathway condition, ceiling notes..."/><Button type="submit"><Ruler className="mr-2 h-4 w-4"/>Save field measurement</Button>
  </form>
  <div className="space-y-2">{measurements.map(m=><div key={m.id} className="flex justify-between rounded-xl border px-3 py-2 text-sm"><span>{m.label}</span><strong>{m.value} {m.unit.toLowerCase()}</strong></div>)}</div>
 </div>;
}
