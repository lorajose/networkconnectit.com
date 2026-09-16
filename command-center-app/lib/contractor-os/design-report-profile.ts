import { createHash, randomUUID } from "node:crypto";
import type { CanvasDocument } from "./design-canvas-state";
import { buildDesignTakeoffItems, type DesignTakeoffItem } from "./design-takeoff";

export type DesignReportSection = "COVER" | "FLOOR_PLANS" | "CAMERA_COVERAGE" | "BOM" | "CABLE_SCHEDULE" | "PRICING_SUMMARY";
export type DesignReportProfile = { sections: readonly DesignReportSection[]; visibleLayerIds?: readonly string[]; includePricing:boolean; clientSafe:boolean };
export type DesignReportFloorSource = { floorId:string; floorName:string; document:CanvasDocument };
export type DesignReportData = { floorPlans:Array<{floorId:string;floorName:string;elementCount:number}>; cameraCoverage:Array<{floorId:string;floorName:string;cameraIds:string[]}>; bom:DesignTakeoffItem[]; cableSchedule:DesignTakeoffItem[] };
export type IssuedDesignReportSnapshot = { id:string; status:"ISSUED"; issuedAt:string; issuedByUserId:string; organizationId:string; designProjectId:string; designRevision:number; estimateId?:string; proposalId?:string; profile:DesignReportProfile; evidenceHash:string };

export const DEFAULT_CLIENT_DESIGN_REPORT_PROFILE:DesignReportProfile={sections:["COVER","FLOOR_PLANS","CAMERA_COVERAGE","BOM","CABLE_SCHEDULE"],includePricing:false,clientSafe:true};
export const DEFAULT_INTERNAL_DESIGN_REPORT_PROFILE:DesignReportProfile={sections:["COVER","FLOOR_PLANS","CAMERA_COVERAGE","BOM","CABLE_SCHEDULE","PRICING_SUMMARY"],includePricing:true,clientSafe:false};

export function resolveDesignReportProfile(profile?:Partial<DesignReportProfile>):DesignReportProfile{const clientSafe=profile?.clientSafe??true;const requested=profile?.sections??DEFAULT_CLIENT_DESIGN_REPORT_PROFILE.sections;return{sections:clientSafe?requested.filter(s=>s!=="PRICING_SUMMARY"):requested,visibleLayerIds:profile?.visibleLayerIds,includePricing:clientSafe?false:Boolean(profile?.includePricing),clientSafe};}
export function reportIncludesSection(profile:DesignReportProfile,section:DesignReportSection){if(section==="PRICING_SUMMARY"&&(profile.clientSafe||!profile.includePricing))return false;return profile.sections.includes(section);}
export function filterReportElementsByLayer<T extends {layerId?:string|null}>(elements:readonly T[],profile:DesignReportProfile):T[]{if(!profile.visibleLayerIds?.length)return[...elements];const visible=new Set(profile.visibleLayerIds);return elements.filter(e=>!e.layerId||visible.has(e.layerId));}

export function buildDesignReportData(floors:readonly DesignReportFloorSource[],profile:DesignReportProfile):DesignReportData{
 const prepared=floors.map(source=>({...source,document:{...source.document,elements:filterReportElementsByLayer(source.document.elements.filter(e=>!e.hidden),profile)}}));
 const grouped=new Map<string,DesignTakeoffItem>();
 for(const item of prepared.flatMap(source=>buildDesignTakeoffItems(source.document))){const current=grouped.get(item.key);if(!current){grouped.set(item.key,{...item,sourceElementIds:[...item.sourceElementIds]});continue;}current.quantity=Math.round((current.quantity+item.quantity)*100)/100;current.sourceElementIds=[...new Set([...current.sourceElementIds,...item.sourceElementIds])].sort();}
 const items=[...grouped.values()].sort((a,b)=>a.key.localeCompare(b.key));
 return{floorPlans:prepared.map(({floorId,floorName,document})=>({floorId,floorName,elementCount:document.elements.length})),cameraCoverage:prepared.map(({floorId,floorName,document})=>({floorId,floorName,cameraIds:document.elements.filter(e=>e.kind==="DEVICE"&&e.cameraFov).map(e=>e.id).sort()})),bom:items.filter(i=>i.unit==="EA"),cableSchedule:items.filter(i=>i.unit==="FT")};
}

export function createIssuedDesignReportSnapshot(input:{issuedByUserId:string;organizationId:string;designProjectId:string;designRevision:number;estimateId?:string;proposalId?:string;profile?:Partial<DesignReportProfile>;evidence:unknown;issuedAt?:Date}):IssuedDesignReportSnapshot{
 if(!input.issuedByUserId.trim())throw new Error("Issued report requires an authenticated user");if(!input.organizationId.trim())throw new Error("Issued report requires an organization");if(!input.designProjectId.trim())throw new Error("Issued report requires a design project");if(!Number.isInteger(input.designRevision)||input.designRevision<1)throw new Error("Invalid design revision");
 const profile=resolveDesignReportProfile(input.profile);const evidenceHash=createHash("sha256").update(JSON.stringify({organizationId:input.organizationId,designProjectId:input.designProjectId,designRevision:input.designRevision,estimateId:input.estimateId??null,proposalId:input.proposalId??null,profile,evidence:input.evidence})).digest("hex");
 return Object.freeze({id:randomUUID(),status:"ISSUED" as const,issuedAt:(input.issuedAt??new Date()).toISOString(),issuedByUserId:input.issuedByUserId,organizationId:input.organizationId,designProjectId:input.designProjectId,designRevision:input.designRevision,estimateId:input.estimateId,proposalId:input.proposalId,profile:Object.freeze({...profile,sections:Object.freeze([...profile.sections])}),evidenceHash});
}
