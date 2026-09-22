type Snapshot={draft?:{name?:string;geometryJson?:string;calibrationJson?:string|null};geometryJson?:string;calibrationJson?:string|null;items?:Array<{id?:string;label?:string|null;pointType?:string;discipline?:string;normalizedX?:number;normalizedY?:number}>};

function parseJson<T>(value:unknown,fallback:T):T{if(typeof value!=="string")return fallback;try{return JSON.parse(value) as T}catch{return fallback}}

export function ApprovedFloorPlanSnapshot({snapshotJson}:{snapshotJson:string}){
 const snapshot=parseJson<Snapshot>(snapshotJson,{});const geometry=parseJson<{rooms?:Array<{id:string;name:string;x:number;y:number;width:number;height:number}>}>(snapshot.draft?.geometryJson??snapshot.geometryJson,{});const calibration=parseJson<{width?:number;length?:number;unit?:string}>(snapshot.draft?.calibrationJson??snapshot.calibrationJson,{});const items=snapshot.items??[];
 return <div className="space-y-3"><div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-white" style={{backgroundImage:"linear-gradient(to right,#e2e8f0 1px,transparent 1px),linear-gradient(to bottom,#e2e8f0 1px,transparent 1px)",backgroundSize:"24px 24px"}}>
  {(geometry.rooms??[]).map(room=><div key={room.id} className="absolute border-2 border-slate-500 bg-white/70 p-2 text-[10px]" style={{left:`${room.x*100}%`,top:`${room.y*100}%`,width:`${room.width*100}%`,height:`${room.height*100}%`}}>{room.name}</div>)}
  {items.filter(i=>Number.isFinite(Number(i.normalizedX))&&Number.isFinite(Number(i.normalizedY))).map((item,index)=><div key={item.id??index} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-900 bg-white px-2 py-1 text-[9px] font-semibold shadow-sm" style={{left:`${Number(item.normalizedX)*100}%`,top:`${Number(item.normalizedY)*100}%`}}>{item.label||item.pointType||"Device"}</div>)}
 </div>{calibration.width&&calibration.length?<p className="text-xs">Calibration: {calibration.width} × {calibration.length} {calibration.unit??""}</p>:null}<p className="text-[10px] text-slate-500">Rendered from the immutable approved snapshot; not from the editable survey draft.</p></div>
}
