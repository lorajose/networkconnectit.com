import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { requireCommercialWriteAccess } from "./commercial-access";
import { requireFieldWorkOrderWriteAccess } from "./field-technician-access";

export type CableRunExecutionInput = {
  organizationId:string; workOrderId:string; itemId:string; runIdentifier:string; scopeType:"NEW"|"EXISTING";
  fromLocation?:string|null; toLocation?:string|null; cableType?:string|null; measuredLength?:number|null; lengthUnit?:"FT"|"M"|null;
  floorLevel?:string|null; terminationPoint?:string|null; deviceLocation?:string|null; deviceType?:string|null;
  pulledInstalled:boolean; terminated:boolean; labeled:boolean; wiremapStatus?:"PASS"|"FAIL"|"NA"|null;
  gigabitLinkStatus?:"PASS"|"FAIL"|"NA"|null; overallTestStatus?:"PASS"|"FAIL"|"NA"|null; evidenceSaved:boolean;
  technicianNote?:string|null; userId:string;
};

const clean=(value:string|undefined|null)=>value?.trim()||null;
const validResult=(value:string|null|undefined)=>!value||["PASS","FAIL","NA"].includes(value);

export async function updateCableRunExecution(actor:CommercialActor & {id:string},input:CableRunExecutionInput){
  const organizationId=input.organizationId.trim();
  const wo=(await prisma.$queryRaw<Array<{surveySessionId:string;projectInstallationId:string}>>(Prisma.sql`
    SELECT surveySessionId,projectInstallationId FROM ProjectWorkOrder
    WHERE id=${input.workOrderId} AND organizationId=${organizationId} LIMIT 1`))[0];
  if(!wo)throw new Error("Work order not found");
  await requireFieldWorkOrderWriteAccess(actor,{organizationId,sessionId:wo.surveySessionId,workOrderId:input.workOrderId});
  if(!input.runIdentifier.trim())throw new Error("Run identifier is required");
  if(input.measuredLength!=null&&(!Number.isFinite(input.measuredLength)||input.measuredLength<0))throw new Error("Measured length must be positive");
  if(!validResult(input.wiremapStatus)||!validResult(input.gigabitLinkStatus)||!validResult(input.overallTestStatus))throw new Error("Invalid cable test result");
  if(input.scopeType==="NEW"&&input.overallTestStatus==="PASS"&&(!input.measuredLength||!input.evidenceSaved))throw new Error("New runs require measured length and tester evidence before PASS");

  return prisma.$transaction(async tx=>{
    const current=(await tx.$queryRaw<Array<{id:string;acceptanceStatus:string|null}>>(Prisma.sql`
      SELECT id,acceptanceStatus FROM ProjectWorkOrderItem
      WHERE id=${input.itemId} AND workOrderId=${input.workOrderId} AND organizationId=${organizationId} LIMIT 1`))[0];
    if(!current)throw new Error("Work order item not found");
    const failed=[input.wiremapStatus,input.gigabitLinkStatus,input.overallTestStatus].includes("FAIL");
    const ready=input.pulledInstalled&&input.terminated&&input.labeled&&input.overallTestStatus==="PASS"&&input.evidenceSaved;
    const status=failed?"ISSUE":ready?"COMPLETED":input.pulledInstalled||input.terminated||input.labeled||input.overallTestStatus?"IN_PROGRESS":"PENDING";
    const acceptanceStatus=failed?"REJECTED":ready?(current.acceptanceStatus==="ACCEPTED"?"ACCEPTED":"READY"):null;

    await tx.$executeRaw(Prisma.sql`UPDATE ProjectWorkOrderItem SET
      runIdentifier=${input.runIdentifier.trim()},scopeType=${input.scopeType},fromLocation=${clean(input.fromLocation)},
      toLocation=${clean(input.toLocation)},cableType=${clean(input.cableType)},measuredLength=${input.measuredLength??null},
      lengthUnit=${input.lengthUnit??null},floorLevel=${clean(input.floorLevel)},terminationPoint=${clean(input.terminationPoint)},
      deviceLocation=${clean(input.deviceLocation)},deviceType=${clean(input.deviceType)},pulledInstalled=${input.pulledInstalled},
      isTerminated=${input.terminated},labeled=${input.labeled},wiremapStatus=${input.wiremapStatus??null},
      gigabitLinkStatus=${input.gigabitLinkStatus??null},testStatus=${input.overallTestStatus??null},
      evidenceSaved=${input.evidenceSaved},acceptanceStatus=${acceptanceStatus},technicianNote=${clean(input.technicianNote)},
      status=${status},completedByUserId=${ready?input.userId:null},completedAt=${ready?new Date():null},updatedAt=NOW(3)
      WHERE id=${input.itemId} AND workOrderId=${input.workOrderId} AND organizationId=${organizationId}`);

    const stages=[["PULLED",input.pulledInstalled],["TERMINATED",input.terminated],["LABELED",input.labeled],
      ["WIREMAP",input.wiremapStatus],["GIGABIT_LINK",input.gigabitLinkStatus],["TESTED",input.overallTestStatus],
      ["EVIDENCE_SAVED",input.evidenceSaved],["READY",ready]] as const;
    for(const [stage,result] of stages)await tx.$executeRaw(Prisma.sql`INSERT INTO ProjectWorkOrderItemEvent
      (id,organizationId,workOrderId,workOrderItemId,stage,result,actorUserId,note,occurredAt)
      VALUES (${randomUUID()},${organizationId},${input.workOrderId},${input.itemId},${stage},${String(result??"")},${input.userId},${clean(input.technicianNote)},NOW(3))`);

    if(failed){
      const existing=await tx.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT id FROM ProjectPunchListItem
        WHERE organizationId=${organizationId} AND workOrderId=${input.workOrderId} AND workOrderItemId=${input.itemId} AND status='OPEN' LIMIT 1`);
      if(!existing[0])await tx.$executeRaw(Prisma.sql`INSERT INTO ProjectPunchListItem
        (id,organizationId,workOrderId,workOrderItemId,title,description,severity,status,createdByUserId,createdAt,updatedAt)
        VALUES (${randomUUID()},${organizationId},${input.workOrderId},${input.itemId},
        ${`Rejected cable run ${input.runIdentifier.trim()}`},'Cable test failed; correct and retest before acceptance.','HIGH','OPEN',${input.userId},NOW(3),NOW(3))`);
    }
    return {status,acceptanceStatus};
  });
}

export async function recordCableRunAcceptance(actor:CommercialActor,input:{organizationId:string;workOrderId:string;itemId:string;accepted:boolean;note?:string|null;userId:string}){
  const organizationId=requireCommercialWriteAccess(actor,input.organizationId.trim());
  return prisma.$transaction(async tx=>{
    const item=(await tx.$queryRaw<Array<{runIdentifier:string|null;status:string}>>(Prisma.sql`SELECT runIdentifier,status FROM ProjectWorkOrderItem WHERE id=${input.itemId} AND workOrderId=${input.workOrderId} AND organizationId=${organizationId} LIMIT 1`))[0];
    if(!item)throw new Error("Cable run not found");
    if(input.accepted&&item.status!=="COMPLETED")throw new Error("Cable run must be Ready before acceptance");
    const decision=input.accepted?"ACCEPTED":"REJECTED";
    await tx.$executeRaw(Prisma.sql`UPDATE ProjectWorkOrderItem SET acceptanceStatus=${decision},updatedAt=NOW(3) WHERE id=${input.itemId} AND organizationId=${organizationId}`);
    await tx.$executeRaw(Prisma.sql`INSERT INTO ProjectWorkOrderItemEvent (id,organizationId,workOrderId,workOrderItemId,stage,result,actorUserId,note,occurredAt)
      VALUES (${randomUUID()},${organizationId},${input.workOrderId},${input.itemId},'CUSTOMER_ACCEPTANCE',${decision},${input.userId},${clean(input.note)},NOW(3))`);
    if(!input.accepted)await tx.$executeRaw(Prisma.sql`INSERT INTO ProjectPunchListItem
      (id,organizationId,workOrderId,workOrderItemId,title,description,severity,status,createdByUserId,createdAt,updatedAt)
      VALUES (${randomUUID()},${organizationId},${input.workOrderId},${input.itemId},${`Rejected cable run ${item.runIdentifier??input.itemId}`},${clean(input.note)},'HIGH','OPEN',${input.userId},NOW(3),NOW(3))`);
    return decision;
  });
}
