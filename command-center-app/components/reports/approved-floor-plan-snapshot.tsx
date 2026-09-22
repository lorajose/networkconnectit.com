type Room={id:string;name:string;x:number;y:number;width:number;height:number};
type Point={id?:string;surveyPointId?:string;label?:string|null;pointType?:string;discipline?:string;normalizedX?:number;normalizedY?:number};
type Snapshot={schemaVersion?:number;draftId?:string;geometry?:{rooms?:Room[]};calibration?:{width?:number;length?:number;unit?:string}|null;points?:Point[]};

function parseSnapshot(value:string):Snapshot{try{return JSON.parse(value) as Snapshot}catch{return {}}}

export function ApprovedFloorPlanSnapshot({snapshotJson}:{snapshotJson:string}){
 const snapshot=parseSnapshot(snapshotJson);const geometry=snapshot.geometry??{};const calibration=snapshot.calibration??{};const points=snapshot.points??[];
 return <div className="space-y-3"><div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-white" style={{backgroundImage:"linear-gradient(to right,#e2e8f0 1px,transparent 1px),linear-gradient(to bottom,#e2e8f0 1px,transparent 1px)",backgroundSize:"24px 24px"}}>
  {(geometry.rooms??[]).map(room=><div key={room.id} className="absolute border-2 border-slate-500 bg-white/70 p-2 text-[10px]" style={{left:`${room.x*100}%`,top:`${room.y*100}%`,width:`${room.width*100}%`,height:`${room.height*100}%`}}>{room.name}</div>)}
  {points.filter(point=>Number.isFinite(Number(point.normalizedX))&&Number.isFinite(Number(point.normalizedY))).map((point,index)=><div key={point.id??point.surveyPointId??index} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-900 bg-white px-2 py-1 text-[9px] font-semibold shadow-sm" style={{left:`${Number(point.normalizedX)*100}%`,top:`${Number(point.normalizedY)*100}%`}}>{point.label||point.pointType||"Device"}</div>)}
 </div>{calibration.width&&calibration.length?<p className="text-xs">Calibration: {calibration.width} × {calibration.length} {calibration.unit??""}</p>:null}<p className="text-[10px] text-slate-500">Rendered from the immutable customer-approved floor plan snapshot; not from the editable survey draft.</p></div>
}
