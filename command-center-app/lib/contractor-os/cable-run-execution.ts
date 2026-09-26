import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { commercialReadScope, requireCommercialWriteAccess } from "./commercial-access";
import { requireFieldWorkOrderWriteAccess } from "./field-technician-access";
import { requireOpenWorkOrder } from "./work-order-lifecycle";

export type CableRunExecutionInput = {
  organizationId:string; workOrderId:string; itemId:string; runIdentifier:string; scopeType:"NEW"|"EXISTING";
  fromLocation?:string|null; toLocation?:string|null; cableType?:string|null; measuredLength?:number|null; lengthUnit?:"FT"|"M"|null;
  floorLevel?:string|null; terminationPoint?:string|null; deviceLocation?:string|null; deviceType?:string|null;
  pulledInstalled:boolean; terminatedEndA:boolean; terminatedEndB:boolean; labeled:boolean; wiremapStatus?:"PASS"|"FAIL"|"NA"|null;
  gigabitLinkStatus?:"PASS"|"FAIL"|"NA"|null; overallTestStatus?:"PASS"|"FAIL"|"NA"|null;
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
  return prisma.$transaction(async tx=>{
    await requireOpenWorkOrder(organizationId,input.workOrderId,tx,true);
    const current=(await tx.$queryRaw<Array<{id:string;acceptanceStatus:string|null;pulledInstalled:boolean;isTerminated:boolean;terminatedEndA:boolean;terminatedEndB:boolean;labeled:boolean;wiremapStatus:string|null;gigabitLinkStatus:string|null;testStatus:string|null;evidenceSaved:boolean;status:string}>>(Prisma.sql`
      SELECT id,acceptanceStatus,pulledInstalled,isTerminated,terminatedEndA,terminatedEndB,labeled,wiremapStatus,gigabitLinkStatus,testStatus,evidenceSaved,status FROM ProjectWorkOrderItem
      WHERE id=${input.itemId} AND workOrderId=${input.workOrderId} AND organizationId=${organizationId} LIMIT 1`))[0];
    if(!current)throw new Error("Work order item not found");
    const testerEvidence=(await tx.$queryRaw<Array<{count:bigint}>>(Prisma.sql`
      SELECT COUNT(*) count FROM ProjectWorkOrderEvidence
      WHERE organizationId=${organizationId} AND workOrderId=${input.workOrderId}
        AND workOrderItemId=${input.itemId} AND evidenceType='TESTER'`))[0];
    const evidenceSaved=Number(testerEvidence?.count??0)>0;
    if(input.scopeType==="NEW"&&input.overallTestStatus==="PASS"&&(!input.measuredLength||!evidenceSaved))throw new Error("New runs require measured length and tester evidence before PASS");
    const terminated=input.terminatedEndA&&input.terminatedEndB;
    const failed=[input.wiremapStatus,input.gigabitLinkStatus,input.overallTestStatus].includes("FAIL");
    const ready=input.pulledInstalled&&terminated&&input.labeled&&input.overallTestStatus==="PASS"&&evidenceSaved;
    const status=failed?"ISSUE":ready?"COMPLETED":input.pulledInstalled||input.terminatedEndA||input.terminatedEndB||input.labeled||input.overallTestStatus?"IN_PROGRESS":"PENDING";
    const acceptanceStatus=failed?"REJECTED":ready?(current.acceptanceStatus==="ACCEPTED"?"ACCEPTED":"READY"):null;

    await tx.$executeRaw(Prisma.sql`UPDATE ProjectWorkOrderItem SET
      runIdentifier=${input.runIdentifier.trim()},scopeType=${input.scopeType},fromLocation=${clean(input.fromLocation)},
      toLocation=${clean(input.toLocation)},cableType=${clean(input.cableType)},measuredLength=${input.measuredLength??null},
      lengthUnit=${input.lengthUnit??null},floorLevel=${clean(input.floorLevel)},terminationPoint=${clean(input.terminationPoint)},
      deviceLocation=${clean(input.deviceLocation)},deviceType=${clean(input.deviceType)},pulledInstalled=${input.pulledInstalled},
      terminatedEndA=${input.terminatedEndA},terminatedEndB=${input.terminatedEndB},isTerminated=${terminated},labeled=${input.labeled},wiremapStatus=${input.wiremapStatus??null},
      gigabitLinkStatus=${input.gigabitLinkStatus??null},testStatus=${input.overallTestStatus??null},
      evidenceSaved=${evidenceSaved},acceptanceStatus=${acceptanceStatus},technicianNote=${clean(input.technicianNote)},
      status=${status},completedByUserId=${ready?input.userId:null},completedAt=${ready?new Date():null},updatedAt=NOW(3)
      WHERE id=${input.itemId} AND workOrderId=${input.workOrderId} AND organizationId=${organizationId}`);

    const stages=[
      ["PULLED",current.pulledInstalled,input.pulledInstalled],
      ["TERMINATED_END_A",current.terminatedEndA,input.terminatedEndA],
      ["TERMINATED_END_B",current.terminatedEndB,input.terminatedEndB],
      ["TERMINATED",current.isTerminated,terminated],
      ["LABELED",current.labeled,input.labeled],
      ["WIREMAP",current.wiremapStatus,input.wiremapStatus??null],
      ["GIGABIT_LINK",current.gigabitLinkStatus,input.gigabitLinkStatus??null],
      ["TESTED",current.testStatus,input.overallTestStatus??null],
      ["EVIDENCE_SAVED",current.evidenceSaved,evidenceSaved],
      ["READY",current.status==="COMPLETED",ready],
    ] as const;
    for(const [stage,before,result] of stages){
      if(String(before??"")===String(result??""))continue;
      await tx.$executeRaw(Prisma.sql`INSERT INTO ProjectWorkOrderItemEvent
        (id,organizationId,workOrderId,workOrderItemId,stage,result,actorUserId,note,occurredAt)
        VALUES (${randomUUID()},${organizationId},${input.workOrderId},${input.itemId},${stage},${String(result??"")},${input.userId},${clean(input.technicianNote)},NOW(3))`);
    }

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
    await requireOpenWorkOrder(organizationId,input.workOrderId,tx,true);
    const item=(await tx.$queryRaw<Array<{runIdentifier:string|null;status:string}>>(Prisma.sql`SELECT runIdentifier,status FROM ProjectWorkOrderItem WHERE id=${input.itemId} AND workOrderId=${input.workOrderId} AND organizationId=${organizationId} LIMIT 1`))[0];
    if(!item)throw new Error("Cable run not found");
    if(input.accepted&&item.status!=="COMPLETED")throw new Error("Cable run must be Ready before acceptance");
    const decision=input.accepted?"ACCEPTED":"REJECTED";
    await tx.$executeRaw(Prisma.sql`UPDATE ProjectWorkOrderItem SET acceptanceStatus=${decision},updatedAt=NOW(3) WHERE id=${input.itemId} AND organizationId=${organizationId}`);
    await tx.$executeRaw(Prisma.sql`INSERT INTO ProjectWorkOrderItemEvent (id,organizationId,workOrderId,workOrderItemId,stage,result,actorUserId,note,occurredAt)
      VALUES (${randomUUID()},${organizationId},${input.workOrderId},${input.itemId},'CUSTOMER_ACCEPTANCE',${decision},${input.userId},${clean(input.note)},NOW(3))`);
    if(!input.accepted){
      const existing=await tx.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT id FROM ProjectPunchListItem
        WHERE organizationId=${organizationId} AND workOrderId=${input.workOrderId} AND workOrderItemId=${input.itemId} AND status='OPEN' LIMIT 1`);
      if(!existing[0])await tx.$executeRaw(Prisma.sql`INSERT INTO ProjectPunchListItem
        (id,organizationId,workOrderId,workOrderItemId,title,description,severity,status,createdByUserId,createdAt,updatedAt)
        VALUES (${randomUUID()},${organizationId},${input.workOrderId},${input.itemId},${`Rejected cable run ${item.runIdentifier??input.itemId}`},${clean(input.note)},'HIGH','OPEN',${input.userId},NOW(3),NOW(3))`);
    }
    return decision;
  });
}


export async function getCableRunProjectSummary(actor:CommercialActor,input:{organizationId:string;workOrderId:string}){
  const organizationId=commercialReadScope(actor,input.organizationId.trim()).organizationId;
  const rows=await prisma.$queryRaw<Array<{total:bigint;newRuns:bigint;existingRuns:bigint;ready:bigint;accepted:bigint;rejected:bigint;failed:bigint;tested:bigint;totalLengthFt:Prisma.Decimal|null;totalLengthM:Prisma.Decimal|null}>>(Prisma.sql`
    SELECT COUNT(*) total,SUM(scopeType='NEW') newRuns,SUM(scopeType='EXISTING') existingRuns,
      SUM(status='COMPLETED') ready,SUM(acceptanceStatus='ACCEPTED') accepted,SUM(acceptanceStatus='REJECTED') rejected,
      SUM(testStatus='FAIL') failed,SUM(testStatus IS NOT NULL) tested,\n      SUM(CASE WHEN lengthUnit='FT' THEN COALESCE(measuredLength,0) ELSE 0 END) totalLengthFt,\n      SUM(CASE WHEN lengthUnit='M' THEN COALESCE(measuredLength,0) ELSE 0 END) totalLengthM
    FROM ProjectWorkOrderItem WHERE organizationId=${organizationId} AND workOrderId=${input.workOrderId}`);
  const r=rows[0];
  return {total:Number(r?.total??0),newRuns:Number(r?.newRuns??0),existingRuns:Number(r?.existingRuns??0),ready:Number(r?.ready??0),accepted:Number(r?.accepted??0),rejected:Number(r?.rejected??0),failed:Number(r?.failed??0),tested:Number(r?.tested??0),totalLengthFt:Number(r?.totalLengthFt??0),totalLengthM:Number(r?.totalLengthM??0)};
}


export type FloorCloseoutInput={
  organizationId:string;workOrderId:string;floorLevel:string;
  cableSupportPassed:boolean;racewayConduitPassed:boolean;firestopPassed:boolean;
  labelReconciliationPassed:boolean;cleanupPassed:boolean;workAreaPhotosSaved:boolean;
  notes?:string|null;userId:string;
};

export async function listWorkOrderFloorCloseouts(actor:CommercialActor,input:{organizationId:string;workOrderId:string}){
  const organizationId=commercialReadScope(actor,input.organizationId.trim()).organizationId;
  return prisma.$queryRaw<Array<{id:string;floorLevel:string;cableSupportPassed:boolean;racewayConduitPassed:boolean;firestopPassed:boolean;labelReconciliationPassed:boolean;cleanupPassed:boolean;workAreaPhotosSaved:boolean;notes:string|null;completedByUserId:string|null;completedAt:Date|null}>>(Prisma.sql`
    SELECT id,floorLevel,cableSupportPassed,racewayConduitPassed,firestopPassed,labelReconciliationPassed,
      cleanupPassed,workAreaPhotosSaved,notes,completedByUserId,completedAt
    FROM ProjectWorkOrderFloorCloseout
    WHERE organizationId=${organizationId} AND workOrderId=${input.workOrderId}
    ORDER BY floorLevel`);
}

export async function saveWorkOrderFloorCloseout(actor:CommercialActor & {id:string},input:FloorCloseoutInput){
  const organizationId=input.organizationId.trim();
  const wo=(await prisma.$queryRaw<Array<{surveySessionId:string}>>(Prisma.sql`
    SELECT surveySessionId FROM ProjectWorkOrder WHERE id=${input.workOrderId} AND organizationId=${organizationId} LIMIT 1`))[0];
  if(!wo)throw new Error("Work order not found");
  await requireFieldWorkOrderWriteAccess(actor,{organizationId,sessionId:wo.surveySessionId,workOrderId:input.workOrderId});
  const floorLevel=input.floorLevel.trim();if(!floorLevel)throw new Error("Floor / area is required");
  const complete=input.cableSupportPassed&&input.racewayConduitPassed&&input.firestopPassed&&input.labelReconciliationPassed&&input.cleanupPassed&&input.workAreaPhotosSaved;
  return prisma.$transaction(async tx=>{
  await requireOpenWorkOrder(organizationId,input.workOrderId,tx,true);
  const existing=(await tx.$queryRaw<Array<{id:string}>>(Prisma.sql`
    SELECT id FROM ProjectWorkOrderFloorCloseout
    WHERE organizationId=${organizationId} AND workOrderId=${input.workOrderId} AND floorLevel=${floorLevel} LIMIT 1`))[0];
  const id=existing?.id??randomUUID();
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO ProjectWorkOrderFloorCloseout
      (id,organizationId,workOrderId,floorLevel,cableSupportPassed,racewayConduitPassed,firestopPassed,labelReconciliationPassed,cleanupPassed,workAreaPhotosSaved,notes,completedByUserId,completedAt,createdAt,updatedAt)
    VALUES (${id},${organizationId},${input.workOrderId},${floorLevel},${input.cableSupportPassed},${input.racewayConduitPassed},${input.firestopPassed},${input.labelReconciliationPassed},${input.cleanupPassed},${input.workAreaPhotosSaved},${clean(input.notes)},${complete?input.userId:null},${complete?new Date():null},NOW(3),NOW(3))
    ON DUPLICATE KEY UPDATE cableSupportPassed=VALUES(cableSupportPassed),racewayConduitPassed=VALUES(racewayConduitPassed),
      firestopPassed=VALUES(firestopPassed),labelReconciliationPassed=VALUES(labelReconciliationPassed),cleanupPassed=VALUES(cleanupPassed),
      workAreaPhotosSaved=VALUES(workAreaPhotosSaved),notes=VALUES(notes),completedByUserId=VALUES(completedByUserId),
      completedAt=VALUES(completedAt),updatedAt=NOW(3)`);
  return {id,floorLevel,complete};
  });
}
