"use client";

import { useMemo, useRef, useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SURVEY_POINT_TYPES, type SurveyDiscipline } from "@/lib/contractor-os/site-survey";

type Asset={id:string;originalName:string;url:string};
type Area={id:string;name:string};
type Point={id:string;assetId:string|null;discipline:string;pointType:string;label:string|null;normalizedX:number|null;normalizedY:number|null};
type Props={organizationId:string;sessionId:string;disciplines:SurveyDiscipline[];assets:Asset[];areas:Area[];points:Point[];action:(formData:FormData)=>void|Promise<void>};
const labels:Record<string,string>={CCTV:"CCTV",NETWORK:"Network / Wi-Fi",ACCESS_CONTROL:"Access Control",FIRE_ALARM:"Fire Alarm",AUDIO_AV:"Audio / AV",RADIO_WIRELESS:"Radio / Wireless"};

export function SurveyPhotoAnnotator({organizationId,sessionId,disciplines,assets,areas,points,action}:Props){
 const [assetId,setAssetId]=useState(assets[0]?.id??"");const [discipline,setDiscipline]=useState<SurveyDiscipline>(disciplines[0]??"CCTV");const [xy,setXy]=useState<{x:number;y:number}|null>(null);const imageRef=useRef<HTMLImageElement>(null);
 const asset=assets.find(a=>a.id===assetId);const assetPoints=useMemo(()=>points.filter(p=>p.assetId===assetId&&p.normalizedX!=null&&p.normalizedY!=null),[points,assetId]);
 function place(event:React.MouseEvent<HTMLDivElement>){const rect=event.currentTarget.getBoundingClientRect();setXy({x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))});}
 if(!assets.length)return <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">Take a site photo first. Then open it here and tap the exact place where the customer wants the device.</div>;
 return <div className="space-y-4">
  <Select value={assetId} onChange={e=>{setAssetId(e.target.value);setXy(null)}}>{assets.map(a=><option key={a.id} value={a.id}>{a.originalName}</option>)}</Select>
  {asset?<div className="relative overflow-hidden rounded-2xl border bg-muted" onClick={place}><img ref={imageRef} src={asset.url} alt={asset.originalName} className="block h-auto w-full select-none" draggable={false}/>{assetPoints.map(p=><div key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{left:`${Number(p.normalizedX)*100}%`,top:`${Number(p.normalizedY)*100}%`}}><div className="flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-background bg-primary px-2 text-[10px] font-bold text-primary-foreground shadow">{p.label||p.pointType.replaceAll("_"," ")}</div></div>)}{xy?<div className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{left:`${xy.x*100}%`,top:`${xy.y*100}%`}}><Crosshair className="h-9 w-9 drop-shadow"/></div>:null}</div>:null}
  <p className="text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3.5 w-3.5"/>Tap the photo where the device/peripheral belongs. The point is saved relative to the image.</p>
  <form action={action} className="grid gap-3">
   <input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="sessionId" value={sessionId}/><input type="hidden" name="assetId" value={assetId}/><input type="hidden" name="normalizedX" value={xy?.x??""}/><input type="hidden" name="normalizedY" value={xy?.y??""}/>
   <Select name="discipline" value={discipline} onChange={e=>setDiscipline(e.target.value as SurveyDiscipline)}>{disciplines.map(d=><option key={d} value={d}>{labels[d]??d}</option>)}</Select>
   <Select name="pointType" required>{SURVEY_POINT_TYPES[discipline].map(type=><option key={type} value={type}>{type.replaceAll("_"," ")}</option>)}</Select>
   <Select name="areaId"><option value="">No area / room</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select>
   <Input name="label" placeholder="Device label, e.g. CAM-01"/>
   <Select name="lifecycle" defaultValue="PROPOSED"><option value="PROPOSED">Customer requested / proposed</option><option value="EXISTING">Existing device</option></Select>
   <Textarea name="notes" placeholder="Mounting location, height, view, pathway, power..."/>
   <Button type="submit" disabled={!xy} className="w-full">Save point + peripheral</Button>
  </form>
 </div>;
}
