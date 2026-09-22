import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";

export type FieldTechnicianAccess={isTechnician:boolean;canAccessSurvey:boolean;canAccessWorkOrder:boolean};
export async function fieldTechnicianAccess(actor:CommercialActor & {id:string},input:{organizationId:string;sessionId:string;workOrderId?:string|null}):Promise<FieldTechnicianAccess>{
 const organizationId=input.organizationId.trim();
 if(actor.role==="SUPER_ADMIN"||actor.role==="INTERNAL_ADMIN")return {isTechnician:false,canAccessSurvey:true,canAccessWorkOrder:true};
 if(!actor.organizationId||actor.organizationId!==organizationId)return {isTechnician:false,canAccessSurvey:false,canAccessWorkOrder:false};
 const profiles=await prisma.$queryRaw<Array<{userId:string}>>(Prisma.sql`SELECT userId FROM FieldTechnicianProfile WHERE organizationId=${organizationId} AND userId=${actor.id} AND status='ACTIVE' LIMIT 1`);
 const isTechnician=Boolean(profiles[0]);if(actor.role==="CLIENT_ADMIN")return {isTechnician,canAccessSurvey:true,canAccessWorkOrder:true};if(!isTechnician)return {isTechnician:false,canAccessSurvey:false,canAccessWorkOrder:false};
 const survey=await prisma.$queryRaw<Array<{assignedToUserId:string|null}>>(Prisma.sql`SELECT a.assignedToUserId FROM SurveySession s JOIN SurveyAssignment a ON a.id=s.assignmentId AND a.organizationId=s.organizationId WHERE s.id=${input.sessionId} AND s.organizationId=${organizationId} LIMIT 1`);
 const canAccessSurvey=survey[0]?.assignedToUserId===actor.id;
 let canAccessWorkOrder=false;if(input.workOrderId){const wo=await prisma.$queryRaw<Array<{assignedToUserId:string|null}>>(Prisma.sql`SELECT assignedToUserId FROM ProjectWorkOrder WHERE id=${input.workOrderId} AND surveySessionId=${input.sessionId} AND organizationId=${organizationId} LIMIT 1`);canAccessWorkOrder=wo[0]?.assignedToUserId===actor.id;}return {isTechnician,canAccessSurvey,canAccessWorkOrder};
}
export async function requireAssignedTechnicianAccess(actor:CommercialActor & {id:string},input:{organizationId:string;sessionId:string;workOrderId?:string|null;scope:"SURVEY"|"WORK_ORDER"}){
 const access=await fieldTechnicianAccess(actor,input);const allowed=input.scope==="SURVEY"?access.canAccessSurvey:access.canAccessWorkOrder;if(!allowed)throw new Error("This field record is not assigned to the current technician");return access;
}


export async function requireFieldSurveyWriteAccess(actor:CommercialActor & {id:string},input:{organizationId:string;sessionId:string}){
 if(actor.role==="SUPER_ADMIN"||actor.role==="INTERNAL_ADMIN")return {isTechnician:false,canAccessSurvey:true,canAccessWorkOrder:true};
 if(actor.role==="CLIENT_ADMIN"){if(actor.organizationId!==input.organizationId.trim())throw new Error("Cross-tenant field write denied");return {isTechnician:false,canAccessSurvey:true,canAccessWorkOrder:true};}
 return requireAssignedTechnicianAccess(actor,{...input,scope:"SURVEY"});
}
export async function requireFieldWorkOrderWriteAccess(actor:CommercialActor & {id:string},input:{organizationId:string;sessionId:string;workOrderId:string}){
 if(actor.role==="SUPER_ADMIN"||actor.role==="INTERNAL_ADMIN")return {isTechnician:false,canAccessSurvey:true,canAccessWorkOrder:true};
 if(actor.role==="CLIENT_ADMIN"){if(actor.organizationId!==input.organizationId.trim())throw new Error("Cross-tenant field write denied");return {isTechnician:false,canAccessSurvey:true,canAccessWorkOrder:true};}
 return requireAssignedTechnicianAccess(actor,{...input,scope:"WORK_ORDER"});
}


export async function requireSiteSurveyPageAccess(actor:CommercialActor & {id:string},input:{organizationId:string;sessionId:string}){
 const organizationId=input.organizationId.trim();
 if(actor.role==="SUPER_ADMIN"||actor.role==="INTERNAL_ADMIN")return {organizationId,isTechnician:false};
 if(!actor.organizationId||actor.organizationId!==organizationId)throw new Error("Cross-tenant site survey access denied");
 if(actor.role==="CLIENT_ADMIN")return {organizationId,isTechnician:false};
 const access=await requireAssignedTechnicianAccess(actor,{organizationId,sessionId:input.sessionId,scope:"SURVEY"});
 return {organizationId,isTechnician:access.isTechnician};
}
