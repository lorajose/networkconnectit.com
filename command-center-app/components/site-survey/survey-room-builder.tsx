"use client";

import { useMemo, useState } from "react";
import { DoorOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Room={id:string;name:string;x:number;y:number;width:number;height:number};
type Geometry={version:number;walls:Array<{id:string;x1:number;y1:number;x2:number;y2:number}>;rooms:Room[]};
type Props={organizationId:string;sessionId:string;draftId:string;geometryJson:string;action:(data:FormData)=>void|Promise<void>};

export function SurveyRoomBuilder({organizationId,sessionId,draftId,geometryJson,action}:Props){
 const initial=useMemo<Geometry>(()=>{try{const g=JSON.parse(geometryJson);return {version:1,walls:Array.isArray(g.walls)?g.walls:[],rooms:Array.isArray(g.rooms)?g.rooms:[]}}catch{return {version:1,walls:[],rooms:[]}}},[geometryJson]);
 const [geometry,setGeometry]=useState(initial);const [name,setName]=useState("");const [start,setStart]=useState<{x:number;y:number}|null>(null);const [end,setEnd]=useState<{x:number;y:number}|null>(null);
 function coordinate(e:React.MouseEvent<HTMLDivElement>){const r=e.currentTarget.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}}
 function tap(e:React.MouseEvent<HTMLDivElement>){const p=coordinate(e);if(!start){setStart(p);setEnd(null)}else setEnd(p)}
 function addRoom(){if(!start||!end||!name.trim())return;const x=Math.min(start.x,end.x),y=Math.min(start.y,end.y),width=Math.abs(end.x-start.x),height=Math.abs(end.y-start.y);if(width<.02||height<.02)return;setGeometry(g=>({...g,rooms:[...g.rooms,{id:crypto.randomUUID(),name:name.trim(),x,y,width,height}]}));setName("");setStart(null);setEnd(null)}
 return <div className="space-y-3">
  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border bg-background" onClick={tap} style={{backgroundImage:"linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",backgroundSize:"24px 24px"}}>
   {geometry.rooms.map(room=><div key={room.id} className="absolute border-2 border-primary/70 bg-primary/5 p-2 text-xs font-medium" style={{left:`${room.x*100}%`,top:`${room.y*100}%`,width:`${room.width*100}%`,height:`${room.height*100}%`}}><div className="flex items-center gap-1"><DoorOpen className="h-3 w-3"/>{room.name}</div></div>)}
   {start&&end?<div className="pointer-events-none absolute border-2 border-dashed border-foreground/70" style={{left:`${Math.min(start.x,end.x)*100}%`,top:`${Math.min(start.y,end.y)*100}%`,width:`${Math.abs(end.x-start.x)*100}%`,height:`${Math.abs(end.y-start.y)*100}%`}}/>:null}
  </div>
  <p className="text-xs text-muted-foreground">Tap two corners of a room/area, name it, then add it to the field draft.</p>
  <div className="flex gap-2"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Room / area name"/><Button type="button" onClick={addRoom} disabled={!start||!end||!name.trim()}><Plus className="mr-2 h-4 w-4"/>Add room</Button></div>
  <div className="space-y-2">{geometry.rooms.map(room=><div key={room.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"><span>{room.name}</span><Button type="button" size="sm" variant="ghost" onClick={()=>setGeometry(g=>({...g,rooms:g.rooms.filter(r=>r.id!==room.id)}))}><Trash2 className="h-4 w-4"/></Button></div>)}</div>
  <form action={action}><input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="sessionId" value={sessionId}/><input type="hidden" name="draftId" value={draftId}/><input type="hidden" name="geometryJson" value={JSON.stringify(geometry)}/><Button type="submit" variant="outline" className="w-full">Save room layout</Button></form>
 </div>;
}
