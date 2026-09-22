"use client";
import { useMemo, useState } from "react";
import { Grid3X3, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Point={id:string;discipline:string;pointType:string;label:string|null};
type Item={id:string;surveyPointId:string|null;discipline:string;pointType:string;label:string|null;normalizedX:number;normalizedY:number};
type Props={organizationId:string;sessionId:string;draft:{id:string;name:string;geometryJson:string;calibrationJson:string|null;items:Item[]};points:Point[];placeAction:(data:FormData)=>void|Promise<void>;saveAction:(data:FormData)=>void|Promise<void>};

export function SurveyFloorPlanBuilder({organizationId,sessionId,draft,points,placeAction,saveAction}:Props){
 const [selectedPoint,setSelectedPoint]=useState(points.find(p=>!draft.items.some(i=>i.surveyPointId===p.id))?.id??points[0]?.id??"");
 const [xy,setXy]=useState<{x:number;y:number}|null>(null);const [width,setWidth]=useState("");const [length,setLength]=useState("");const [unit,setUnit]=useState("FT");
 const geometry=useMemo(()=>{try{return JSON.parse(draft.geometryJson) as {rooms?:Array<{id:string;name:string;x:number;y:number;width:number;height:number}>}}catch{return {}}},[draft.geometryJson]);
 function tap(e:React.MouseEvent<HTMLDivElement>){const r=e.currentTarget.getBoundingClientRect();setXy({x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))});}
 return <div className="space-y-4">
  <div><h3 className="font-semibold">{draft.name}</h3><p className="text-sm text-muted-foreground">Progressive field draft — technician confirmation/calibration required before design use.</p></div>
  <div onClick={tap} className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-background" style={{backgroundImage:"linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",backgroundSize:"24px 24px"}}>
   {(geometry.rooms??[]).map(room=><div key={room.id} className="absolute border-2 border-foreground/50 bg-background/70 p-2 text-xs" style={{left:`${room.x*100}%`,top:`${room.y*100}%`,width:`${room.width*100}%`,height:`${room.height*100}%`}}>{room.name}</div>)}
   {draft.items.map(item=><div key={item.id} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground shadow" style={{left:`${item.normalizedX*100}%`,top:`${item.normalizedY*100}%`}}>{item.label||item.pointType.replaceAll("_"," ")}</div>)}
   {xy?<MapPin className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-full drop-shadow" style={{left:`${xy.x*100}%`,top:`${xy.y*100}%`}}/>:null}
  </div>
  <form action={placeAction} className="grid gap-3 sm:grid-cols-[1fr_auto]"><input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="sessionId" value={sessionId}/><input type="hidden" name="draftId" value={draft.id}/><input type="hidden" name="normalizedX" value={xy?.x??""}/><input type="hidden" name="normalizedY" value={xy?.y??""}/><Select name="surveyPointId" value={selectedPoint} onChange={e=>setSelectedPoint(e.target.value)} required><option value="">Select captured point</option>{points.map(p=><option key={p.id} value={p.id}>{p.label||p.pointType.replaceAll("_"," ")} · {p.discipline}</option>)}</Select><Button type="submit" disabled={!xy||!selectedPoint}>Place on floor plan</Button></form>
  <form action={saveAction} className="rounded-2xl border p-4"><input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="sessionId" value={sessionId}/><input type="hidden" name="draftId" value={draft.id}/><input type="hidden" name="geometryJson" value={draft.geometryJson}/><input type="hidden" name="calibrationJson" value={width&&length?JSON.stringify({width:Number(width),length:Number(length),unit}):""}/><div className="mb-2 flex items-center gap-2"><Grid3X3 className="h-4 w-4"/><span className="text-sm font-medium">Field calibration</span></div><div className="grid gap-2 sm:grid-cols-3"><Input inputMode="decimal" value={width} onChange={e=>setWidth(e.target.value)} placeholder="Known width"/><Input inputMode="decimal" value={length} onChange={e=>setLength(e.target.value)} placeholder="Known length"/><Select value={unit} onChange={e=>setUnit(e.target.value)}><option value="FT">Feet</option><option value="M">Meters</option></Select></div><Button type="submit" variant="outline" className="mt-3 w-full" disabled={!width||!length}>Save calibration</Button></form>
 </div>;
}
