import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { requireCommercialWriteAccess } from "./commercial-access";

function hash(value:string){return createHash("sha256").update(value).digest("hex");}
export async function submitFloorPlanForCustomerApproval(actor:CommercialActor,input:{organizationId:string;sessionId:string;draftId:string;userId:string;customerName?:string|null;customerEmail?:string|null}){
 const organizationId=requireCommercialWriteAccess(actor,input.organizationId.trim());
 return prisma.$transaction(async tx=>{
  const rows=await tx.$queryRaw<Array<{projectInstallationId:string;geometryJson:string;calibrationJson:string|null}>>(Prisma.sql`SELECT a.projectInstallationId,d.geometryJson,d.calibrationJson FROM SurveyFloorPlanDraft d JOIN SurveySession s ON s.id=d.sessionId AND s.organizationId=d.organizationId JOIN SurveyAssignment a ON a.id=s.assignmentId AND a.organizationId=s.organizationId WHERE d.id=${input.draftId} AND d.sessionId=${input.sessionId} AND d.organizationId=${organizationId} LIMIT 1`);
  const source=rows[0];if(!source)throw new Error("Floor plan draft not found");
  const points=await tx.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`SELECT i.id,i.surveyPointId,i.discipline,i.pointType,i.label,i.normalizedX,i.normalizedY FROM SurveyFloorPlanItem i WHERE i.organizationId=${organizationId} AND i.floorPlanDraftId=${input.draftId} ORDER BY i.createdAt`);
  const snapshot=JSON.stringify({schemaVersion:1,draftId:input.draftId,geometry:JSON.parse(source.geometryJson),calibration:source.calibrationJson?JSON.parse(source.calibrationJson):null,points});
  const snapshotHash=hash(snapshot);
  const prior=await tx.$queryRaw<Array<{revisionNumber:number}>>(Prisma.sql`SELECT revisionNumber FROM SurveyFloorPlanApproval WHERE organizationId=${organizationId} AND sessionId=${input.sessionId} ORDER BY revisionNumber DESC LIMIT 1`);
  const revisionNumber=(prior[0]?.revisionNumber??0)+1,id=randomUUID();
  await tx.$executeRaw(Prisma.sql`INSERT INTO SurveyFloorPlanApproval (id,organizationId,sessionId,floorPlanDraftId,revisionNumber,snapshotJson,snapshotHash,status,customerName,customerEmail,createdByUserId,createdAt,updatedAt) VALUES (${id},${organizationId},${input.sessionId},${input.draftId},${revisionNumber},${snapshot},${snapshotHash},'PENDING_CUSTOMER',${input.customerName?.trim()||null},${input.customerEmail?.trim()||null},${input.userId},NOW(3),NOW(3))`);
  await tx.$executeRaw(Prisma.sql`INSERT INTO ProjectActivityEvent (id,organizationId,projectInstallationId,surveySessionId,eventType,actorUserId,summary,detailsJson,occurredAt) VALUES (${randomUUID()},${organizationId},${source.projectInstallationId},${input.sessionId},'FLOOR_PLAN_SUBMITTED',${input.userId},${`Floor plan revision ${revisionNumber} submitted for customer approval`},${JSON.stringify({approvalId:id,revisionNumber,snapshotHash})},NOW(3))`);
  return {id,revisionNumber};
 });
}

export async function recordCustomerFloorPlanDecision(actor:CommercialActor,input:{organizationId:string;approvalId:string;approved:boolean;customerName:string;customerNote?:string|null;userId:string}){
 const organizationId=requireCommercialWriteAccess(actor,input.organizationId.trim());
 return prisma.$transaction(async tx=>{
  const rows=await tx.$queryRaw<Array<{id:string;sessionId:string;floorPlanDraftId:string;revisionNumber:number;projectInstallationId:string;siteId:string;snapshotJson:string}>>(Prisma.sql`SELECT ap.id,ap.sessionId,ap.floorPlanDraftId,ap.revisionNumber,a.projectInstallationId,a.siteId,ap.snapshotJson FROM SurveyFloorPlanApproval ap JOIN SurveySession s ON s.id=ap.sessionId AND s.organizationId=ap.organizationId JOIN SurveyAssignment a ON a.id=s.assignmentId AND a.organizationId=s.organizationId WHERE ap.id=${input.approvalId} AND ap.organizationId=${organizationId} AND ap.status='PENDING_CUSTOMER' LIMIT 1`);
  const ap=rows[0];if(!ap)throw new Error("Pending floor plan approval not found");
  const status=input.approved?"APPROVED":"CHANGES_REQUESTED";
  await tx.$executeRaw(Prisma.sql`UPDATE SurveyFloorPlanApproval SET status=${status},customerName=${input.customerName.trim()},customerNote=${input.customerNote?.trim()||null},approvedAt=${input.approved?new Date():null},approvedByUserId=${input.userId},updatedAt=NOW(3) WHERE id=${ap.id} AND organizationId=${organizationId}`);
  let workOrderId:string|null=null;
  if(input.approved){workOrderId=randomUUID();await tx.$executeRaw(Prisma.sql`INSERT INTO ProjectWorkOrder (id,organizationId,projectInstallationId,siteId,surveySessionId,floorPlanApprovalId,title,status,customerNote,createdByUserId,createdAt,updatedAt) VALUES (${workOrderId},${organizationId},${ap.projectInstallationId},${ap.siteId},${ap.sessionId},${ap.id},${`Installation Work Order - Floor Plan R${ap.revisionNumber}`},'READY',${input.customerNote?.trim()||null},${input.userId},NOW(3),NOW(3))`);
   const snapshot=JSON.parse(ap.snapshotJson) as {points?:Array<{surveyPointId?:string;discipline:string;pointType:string;label?:string|null}>};let order=0;for(const p of snapshot.points??[]){await tx.$executeRaw(Prisma.sql`INSERT INTO ProjectWorkOrderItem (id,organizationId,workOrderId,sourceSurveyPointId,discipline,itemType,label,status,sortOrder,createdAt,updatedAt) VALUES (${randomUUID()},${organizationId},${workOrderId},${p.surveyPointId??null},${p.discipline},${p.pointType},${p.label??null},'PENDING',${order++},NOW(3),NOW(3))`);}}
  await tx.$executeRaw(Prisma.sql`INSERT INTO ProjectActivityEvent (id,organizationId,projectInstallationId,surveySessionId,workOrderId,eventType,actorUserId,actorName,actorType,summary,detailsJson,customerNote,occurredAt) VALUES (${randomUUID()},${organizationId},${ap.projectInstallationId},${ap.sessionId},${workOrderId},${input.approved?'FLOOR_PLAN_APPROVED':'FLOOR_PLAN_CHANGES_REQUESTED'},${input.userId},${input.customerName.trim()},'CUSTOMER',${input.approved?`Customer approved floor plan revision ${ap.revisionNumber}`:`Customer requested changes to floor plan revision ${ap.revisionNumber}`},${JSON.stringify({approvalId:ap.id,revisionNumber:ap.revisionNumber})},${input.customerNote?.trim()||null},NOW(3))`);
  return {status,workOrderId};
 });
}


export type FloorPlanApprovalSummary={id:string;revisionNumber:number;status:string;customerName:string|null;customerEmail:string|null;customerNote:string|null;approvedAt:Date|null;createdAt:Date};
export async function listFloorPlanApprovals(actor:CommercialActor,input:{organizationId:string;sessionId:string}){
 const organizationId=input.organizationId.trim();
 if(actor.role==="CLIENT_ADMIN"||actor.role==="VIEWER"){if(actor.organizationId!==organizationId)throw new Error("Cross-tenant approval read denied");}
 return prisma.$queryRaw<FloorPlanApprovalSummary[]>(Prisma.sql`SELECT id,revisionNumber,status,customerName,customerEmail,customerNote,approvedAt,createdAt FROM SurveyFloorPlanApproval WHERE organizationId=${organizationId} AND sessionId=${input.sessionId} ORDER BY revisionNumber DESC`);
}
export type ProjectActivitySummary={id:string;eventType:string;actorName:string|null;actorType:string;summary:string;customerNote:string|null;occurredAt:Date};
export async function listProjectActivity(actor:CommercialActor,input:{organizationId:string;sessionId:string}){
 const organizationId=input.organizationId.trim();
 if(actor.role==="CLIENT_ADMIN"||actor.role==="VIEWER"){if(actor.organizationId!==organizationId)throw new Error("Cross-tenant activity read denied");}
 return prisma.$queryRaw<ProjectActivitySummary[]>(Prisma.sql`SELECT id,eventType,actorName,actorType,summary,customerNote,occurredAt FROM ProjectActivityEvent WHERE organizationId=${organizationId} AND surveySessionId=${input.sessionId} ORDER BY occurredAt DESC`);
}
