import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { CommercialActor } from "./commercial-access";
import { commercialReadScope, requireCommercialWriteAccess } from "./commercial-access";
import { checklistForDisciplines, SURVEY_POINT_TYPES, type SurveyDiscipline } from "./site-survey";

export type SurveyAssignmentSummary = {
  id: string;
  organizationId: string;
  projectInstallationId: string;
  siteId: string;
  title: string;
  status: string;
  disciplinesJson: string;
  assignedToUserId: string | null;
  scheduledAt: Date | null;
  dueAt: Date | null;
  updatedAt: Date;
  projectName: string;
  siteName: string;
  technicianName: string | null;
};

function clean(value: string, label: string) {
  const result = value.trim();
  if (!result) throw new Error(`${label} is required`);
  if (result.length > 191) throw new Error(`${label} is too long`);
  return result;
}

export async function listSurveyAssignments(actor: CommercialActor, requestedOrganizationId?: string) {
  const scope = commercialReadScope(actor, requestedOrganizationId);
  return prisma.$queryRaw<SurveyAssignmentSummary[]>(Prisma.sql`
    SELECT a.id,a.organizationId,a.projectInstallationId,a.siteId,a.title,a.status,
      a.disciplinesJson,a.assignedToUserId,a.scheduledAt,a.dueAt,a.updatedAt,
      p.name AS projectName,s.name AS siteName,u.name AS technicianName
    FROM SurveyAssignment a
    JOIN ProjectInstallation p ON p.id=a.projectInstallationId AND p.organizationId=a.organizationId
    JOIN Site s ON s.id=a.siteId AND s.organizationId=a.organizationId
    LEFT JOIN User u ON u.id=a.assignedToUserId AND u.organizationId=a.organizationId
    WHERE a.organizationId=${scope.organizationId}
    ORDER BY a.updatedAt DESC
  `);
}

export async function createSurveyAssignment(
  actor: CommercialActor,
  input: {
    organizationId: string;
    projectInstallationId: string;
    siteId: string;
    title: string;
    disciplines: SurveyDiscipline[];
    assignedToUserId?: string | null;
    assignedByUserId: string;
    instructions?: string | null;
  },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  const projectRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT p.id FROM ProjectInstallation p
    JOIN ProjectSite ps ON ps.projectInstallationId=p.id AND ps.organizationId=p.organizationId
    WHERE p.id=${input.projectInstallationId} AND p.organizationId=${organizationId}
      AND ps.siteId=${input.siteId}
    LIMIT 1
  `);
  if (!projectRows[0]) throw new Error("Project/site relationship not found for this organization");

  if (input.assignedToUserId) {
    const users = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM User WHERE id=${input.assignedToUserId} AND organizationId=${organizationId} LIMIT 1
    `);
    if (!users[0]) throw new Error("Assigned technician is not a member of this organization");
  }

  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO SurveyAssignment
      (id,organizationId,projectInstallationId,siteId,title,status,disciplinesJson,
       assignedToUserId,assignedByUserId,instructions,createdAt,updatedAt)
    VALUES
      (${id},${organizationId},${input.projectInstallationId},${input.siteId},
       ${clean(input.title,"Survey title")},'ASSIGNED',${JSON.stringify(input.disciplines)},
       ${input.assignedToUserId ?? null},${input.assignedByUserId},
       ${input.instructions?.trim() || null},NOW(3),NOW(3))
  `);
  return id;
}

export async function startSurveySession(
  actor: CommercialActor,
  input: { organizationId: string; assignmentId: string; technicianUserId: string },
) {
  const organizationId = requireCommercialWriteAccess(actor, input.organizationId.trim());
  const assignments = await prisma.$queryRaw<Array<{ disciplinesJson: string }>>(Prisma.sql`
    SELECT disciplinesJson FROM SurveyAssignment
    WHERE id=${input.assignmentId} AND organizationId=${organizationId} LIMIT 1
  `);
  const assignment = assignments[0];
  if (!assignment) throw new Error("Survey assignment not found");
  const disciplines = JSON.parse(assignment.disciplinesJson) as SurveyDiscipline[];
  const checklist = checklistForDisciplines(disciplines);
  const id = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO SurveySession
        (id,organizationId,assignmentId,technicianUserId,status,checklistSnapshotJson,startedAt,createdAt,updatedAt)
      VALUES
        (${id},${organizationId},${input.assignmentId},${input.technicianUserId},
         'IN_PROGRESS',${JSON.stringify(checklist)},NOW(3),NOW(3),NOW(3))
    `);
    await tx.$executeRaw(Prisma.sql`
      UPDATE SurveyAssignment SET status='IN_PROGRESS',updatedAt=NOW(3)
      WHERE id=${input.assignmentId} AND organizationId=${organizationId}
    `);
  });
  return id;
}


export type SurveySessionWorkspace = {
  session: { id:string; organizationId:string; assignmentId:string; technicianUserId:string; status:string; checklistSnapshotJson:string; startedAt:Date; completedAt:Date|null; notes:string|null };
  assignment: { id:string; title:string; disciplinesJson:string; projectInstallationId:string; siteId:string; projectName:string; siteName:string };
  responses: Array<{ itemKey:string; status:string; valueJson:string|null; notes:string|null; completedAt:Date|null }>;
  areas: Array<{ id:string; name:string; areaType:string; levelOrder:number }>;
  points: Array<{ id:string; areaId:string|null; assetId:string|null; discipline:string; pointType:string; lifecycle:string; label:string|null; normalizedX:Prisma.Decimal|null; normalizedY:Prisma.Decimal|null; notes:string|null; createdAt:Date }>;
  assets: Array<{ id:string; areaId:string|null; kind:string; originalName:string; mimeType:string; storageKey:string; byteSize:bigint; capturedAt:Date|null; createdAt:Date }>;
  measurements: Array<{id:string;areaId:string|null;floorPlanDraftId:string|null;measurementType:string;label:string;value:Prisma.Decimal;unit:string;startX:Prisma.Decimal|null;startY:Prisma.Decimal|null;endX:Prisma.Decimal|null;endY:Prisma.Decimal|null;notes:string|null;createdAt:Date}>;
  photoAreaLinks:Array<{id:string;areaId:string;assetId:string;viewLabel:string|null;sortOrder:number}>;
};

export async function getSurveySessionWorkspace(actor: CommercialActor, sessionId:string, requestedOrganizationId?:string):Promise<SurveySessionWorkspace|null>{
  const scope=commercialReadScope(actor,requestedOrganizationId);
  const rows=await prisma.$queryRaw<Array<SurveySessionWorkspace["session"] & SurveySessionWorkspace["assignment"]>>(Prisma.sql`
    SELECT ss.id,ss.organizationId,ss.assignmentId,ss.technicianUserId,ss.status,ss.checklistSnapshotJson,ss.startedAt,ss.completedAt,ss.notes,
      a.title,a.disciplinesJson,a.projectInstallationId,a.siteId,p.name AS projectName,s.name AS siteName
    FROM SurveySession ss
    JOIN SurveyAssignment a ON a.id=ss.assignmentId AND a.organizationId=ss.organizationId
    JOIN ProjectInstallation p ON p.id=a.projectInstallationId AND p.organizationId=a.organizationId
    JOIN Site s ON s.id=a.siteId AND s.organizationId=a.organizationId
    WHERE ss.id=${sessionId} AND ss.organizationId=${scope.organizationId} LIMIT 1
  `);
  const row=rows[0]; if(!row)return null;
  const [responses,areas,points,assets,measurements,photoAreaLinks]=await Promise.all([
    prisma.$queryRaw<SurveySessionWorkspace["responses"]>(Prisma.sql`SELECT itemKey,status,valueJson,notes,completedAt FROM SurveyChecklistResponse WHERE organizationId=${scope.organizationId} AND sessionId=${sessionId}`),
    prisma.$queryRaw<SurveySessionWorkspace["areas"]>(Prisma.sql`SELECT id,name,areaType,levelOrder FROM SurveyArea WHERE organizationId=${scope.organizationId} AND sessionId=${sessionId} ORDER BY levelOrder,createdAt`),
    prisma.$queryRaw<SurveySessionWorkspace["points"]>(Prisma.sql`SELECT id,areaId,assetId,discipline,pointType,lifecycle,label,normalizedX,normalizedY,notes,createdAt FROM SurveyPoint WHERE organizationId=${scope.organizationId} AND sessionId=${sessionId} ORDER BY createdAt`),
    prisma.$queryRaw<SurveySessionWorkspace["assets"]>(Prisma.sql`SELECT id,areaId,kind,originalName,mimeType,storageKey,byteSize,capturedAt,createdAt FROM SurveyAsset WHERE organizationId=${scope.organizationId} AND sessionId=${sessionId} ORDER BY createdAt DESC`),
    prisma.$queryRaw<SurveySessionWorkspace["measurements"]>(Prisma.sql`SELECT id,areaId,floorPlanDraftId,measurementType,label,value,unit,startX,startY,endX,endY,notes,createdAt FROM SurveyMeasurement WHERE organizationId=${scope.organizationId} AND sessionId=${sessionId} ORDER BY createdAt DESC`),
    prisma.$queryRaw<SurveySessionWorkspace["photoAreaLinks"]>(Prisma.sql`SELECT id,areaId,assetId,viewLabel,sortOrder FROM SurveyPhotoAreaLink WHERE organizationId=${scope.organizationId} AND sessionId=${sessionId} ORDER BY areaId,sortOrder,createdAt`),
  ]);
  return {session:{id:row.id,organizationId:row.organizationId,assignmentId:row.assignmentId,technicianUserId:row.technicianUserId,status:row.status,checklistSnapshotJson:row.checklistSnapshotJson,startedAt:row.startedAt,completedAt:row.completedAt,notes:row.notes},assignment:{id:row.assignmentId,title:row.title,disciplinesJson:row.disciplinesJson,projectInstallationId:row.projectInstallationId,siteId:row.siteId,projectName:row.projectName,siteName:row.siteName},responses,areas,points,assets,measurements,photoAreaLinks};
}

export async function updateSurveyChecklistResponse(actor:CommercialActor,input:{organizationId:string;sessionId:string;itemKey:string;status:"PENDING"|"PASS"|"FAIL"|"NA";notes?:string|null;userId:string}){
  const organizationId=requireScopedFieldWriteAccess(actor,input.organizationId.trim());
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO SurveyChecklistResponse (id,organizationId,sessionId,itemKey,status,notes,completedByUserId,completedAt,updatedAt)
    SELECT ${randomUUID()},${organizationId},ss.id,${clean(input.itemKey,"Checklist item")},${input.status},${input.notes?.trim()||null},${input.userId},
      CASE WHEN ${input.status}='PENDING' THEN NULL ELSE NOW(3) END,NOW(3)
    FROM SurveySession ss WHERE ss.id=${input.sessionId} AND ss.organizationId=${organizationId}
    ON DUPLICATE KEY UPDATE status=VALUES(status),notes=VALUES(notes),completedByUserId=VALUES(completedByUserId),completedAt=VALUES(completedAt),updatedAt=NOW(3)
  `);
}

export async function createSurveyArea(actor:CommercialActor,input:{organizationId:string;sessionId:string;name:string;areaType?:string}){
  const organizationId=requireScopedFieldWriteAccess(actor,input.organizationId.trim());
  const id=randomUUID();
  const result=await prisma.$executeRaw(Prisma.sql`
    INSERT INTO SurveyArea (id,organizationId,sessionId,areaType,name,levelOrder,createdAt,updatedAt)
    SELECT ${id},${organizationId},ss.id,${input.areaType?.trim()||"AREA"},${clean(input.name,"Area name")},
      (SELECT COALESCE(MAX(a.levelOrder),-1)+1 FROM SurveyArea a WHERE a.organizationId=${organizationId} AND a.sessionId=${input.sessionId}),NOW(3),NOW(3)
    FROM SurveySession ss WHERE ss.id=${input.sessionId} AND ss.organizationId=${organizationId}
  `);
  if(!result)throw new Error("Survey session not found");
  return id;
}

export async function createSurveyPoint(actor:CommercialActor,input:{organizationId:string;sessionId:string;areaId?:string|null;assetId?:string|null;discipline:SurveyDiscipline;pointType:string;lifecycle?:"EXISTING"|"PROPOSED";label?:string|null;normalizedX?:number|null;normalizedY?:number|null;notes?:string|null;userId:string}){
  const organizationId=requireScopedFieldWriteAccess(actor,input.organizationId.trim());
  if(!SURVEY_POINT_TYPES[input.discipline]?.includes(input.pointType))throw new Error("Point type is not valid for the selected discipline");
  for(const coordinate of [input.normalizedX,input.normalizedY])if(coordinate!=null&&(!Number.isFinite(coordinate)||coordinate<0||coordinate>1))throw new Error("Photo point coordinates must be between 0 and 1");
  if(input.areaId){const area=await prisma.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT id FROM SurveyArea WHERE id=${input.areaId} AND organizationId=${organizationId} AND sessionId=${input.sessionId} LIMIT 1`);if(!area[0])throw new Error("Survey area does not belong to this session");}
  if(input.assetId){const asset=await prisma.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT id FROM SurveyAsset WHERE id=${input.assetId} AND organizationId=${organizationId} AND sessionId=${input.sessionId} LIMIT 1`);if(!asset[0])throw new Error("Survey photo does not belong to this session");}
  const id=randomUUID();
  const result=await prisma.$executeRaw(Prisma.sql`
    INSERT INTO SurveyPoint (id,organizationId,sessionId,areaId,assetId,discipline,pointType,lifecycle,label,normalizedX,normalizedY,notes,createdByUserId,createdAt,updatedAt)
    SELECT ${id},${organizationId},ss.id,${input.areaId??null},${input.assetId??null},${input.discipline},${clean(input.pointType,"Point type")},${input.lifecycle??"PROPOSED"},${input.label?.trim()||null},${input.normalizedX??null},${input.normalizedY??null},${input.notes?.trim()||null},${input.userId},NOW(3),NOW(3)
    FROM SurveySession ss WHERE ss.id=${input.sessionId} AND ss.organizationId=${organizationId}
  `);
  if(!result)throw new Error("Survey session not found");
  return id;
}

export async function persistSurveyAsset(actor:CommercialActor,input:{organizationId:string;sessionId:string;areaId?:string|null;assetId:string;originalName:string;mimeType:string;storageKey:string;byteSize:number;sha256:string;userId:string}){
  const organizationId=requireScopedFieldWriteAccess(actor,input.organizationId.trim());
  if(input.areaId){const area=await prisma.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT id FROM SurveyArea WHERE id=${input.areaId} AND sessionId=${input.sessionId} AND organizationId=${organizationId} LIMIT 1`);if(!area[0])throw new Error("Survey asset area must belong to the same survey session");}
  const result=await prisma.$executeRaw(Prisma.sql`
    INSERT INTO SurveyAsset (id,organizationId,sessionId,areaId,kind,originalName,mimeType,storageKey,byteSize,sha256,capturedAt,capturedByUserId,createdAt)
    SELECT ${input.assetId},${organizationId},ss.id,${input.areaId??null},'PHOTO',${input.originalName},${input.mimeType},${input.storageKey},${input.byteSize},${input.sha256},NOW(3),${input.userId},NOW(3)
    FROM SurveySession ss WHERE ss.id=${input.sessionId} AND ss.organizationId=${organizationId}
  `);
  if(!result)throw new Error("Survey session not found");
}

export async function completeSurveySession(actor:CommercialActor,input:{organizationId:string;sessionId:string}){
  const organizationId=requireScopedFieldWriteAccess(actor,input.organizationId.trim());
  const sessions=await prisma.$queryRaw<Array<{assignmentId:string;checklistSnapshotJson:string}>>(Prisma.sql`SELECT assignmentId,checklistSnapshotJson FROM SurveySession WHERE id=${input.sessionId} AND organizationId=${organizationId} LIMIT 1`);
  const session=sessions[0];if(!session)throw new Error("Survey session not found");
  const checklist=JSON.parse(session.checklistSnapshotJson) as Array<{items:Array<{key:string;required:boolean}>}>;
  const required=checklist.flatMap(section=>section.items).filter(item=>item.required).map(item=>item.key);
  const responses=await prisma.$queryRaw<Array<{itemKey:string;status:string}>>(Prisma.sql`SELECT itemKey,status FROM SurveyChecklistResponse WHERE organizationId=${organizationId} AND sessionId=${input.sessionId}`);
  const done=new Set(responses.filter(r=>r.status!=="PENDING").map(r=>r.itemKey));
  const missing=required.filter(key=>!done.has(key));
  if(missing.length)throw new Error(`Complete required checklist items before finishing (${missing.length} remaining)`);
  await prisma.$transaction([
    prisma.$executeRaw(Prisma.sql`UPDATE SurveySession SET status='COMPLETE',completedAt=NOW(3),updatedAt=NOW(3) WHERE id=${input.sessionId} AND organizationId=${organizationId}`),
    prisma.$executeRaw(Prisma.sql`UPDATE SurveyAssignment SET status='COMPLETE',updatedAt=NOW(3) WHERE id=${session.assignmentId} AND organizationId=${organizationId}`),
  ]);
}


export type SurveyFloorPlanDraftView={
  id:string;name:string;areaId:string|null;source:string;status:string;geometryJson:string;calibrationJson:string|null;updatedAt:Date;
  items:Array<{id:string;surveyPointId:string|null;discipline:string;pointType:string;label:string|null;normalizedX:Prisma.Decimal;normalizedY:Prisma.Decimal;rotationDegrees:Prisma.Decimal|null}>;
};

export async function getOrCreateSurveyFloorPlanDraft(actor:CommercialActor,input:{organizationId:string;sessionId:string;areaId?:string|null;userId:string}):Promise<SurveyFloorPlanDraftView>{
 const organizationId=requireScopedFieldWriteAccess(actor,input.organizationId.trim());
 const existing=await prisma.$queryRaw<Array<Omit<SurveyFloorPlanDraftView,"items">>>(Prisma.sql`SELECT id,name,areaId,source,status,geometryJson,calibrationJson,updatedAt FROM SurveyFloorPlanDraft WHERE organizationId=${organizationId} AND sessionId=${input.sessionId} AND ((areaId IS NULL AND ${input.areaId??null} IS NULL) OR areaId=${input.areaId??null}) ORDER BY updatedAt DESC LIMIT 1`);
 let draft=existing[0];
 if(!draft){
  const sessionRows=await prisma.$queryRaw<Array<{title:string;siteName:string}>>(Prisma.sql`SELECT a.title,s.name AS siteName FROM SurveySession ss JOIN SurveyAssignment a ON a.id=ss.assignmentId AND a.organizationId=ss.organizationId JOIN Site s ON s.id=a.siteId AND s.organizationId=a.organizationId WHERE ss.id=${input.sessionId} AND ss.organizationId=${organizationId} LIMIT 1`);
  if(!sessionRows[0])throw new Error("Survey session not found");
  const id=randomUUID(),name=`${sessionRows[0].siteName} - Field floor plan draft`;
  await prisma.$executeRaw(Prisma.sql`INSERT INTO SurveyFloorPlanDraft (id,organizationId,sessionId,areaId,name,source,status,geometryJson,createdByUserId,createdAt,updatedAt) VALUES (${id},${organizationId},${input.sessionId},${input.areaId??null},${name},'FIELD_CAPTURE','DRAFT','{"version":1,"walls":[],"rooms":[]}',${input.userId},NOW(3),NOW(3))`);
  draft={id,name,areaId:input.areaId??null,source:"FIELD_CAPTURE",status:"DRAFT",geometryJson:'{"version":1,"walls":[],"rooms":[]}',calibrationJson:null,updatedAt:new Date()};
 }
 const items=await prisma.$queryRaw<SurveyFloorPlanDraftView["items"]>(Prisma.sql`SELECT id,surveyPointId,discipline,pointType,label,normalizedX,normalizedY,rotationDegrees FROM SurveyFloorPlanItem WHERE organizationId=${organizationId} AND floorPlanDraftId=${draft.id} ORDER BY createdAt`);
 return {...draft,items};
}

export async function placeSurveyPointOnFloorPlan(actor:CommercialActor,input:{organizationId:string;sessionId:string;draftId:string;surveyPointId:string;normalizedX:number;normalizedY:number}){
 const organizationId=requireScopedFieldWriteAccess(actor,input.organizationId.trim());
 for(const coordinate of [input.normalizedX,input.normalizedY])if(!Number.isFinite(coordinate)||coordinate<0||coordinate>1)throw new Error("Floor plan coordinates must be between 0 and 1");
 const points=await prisma.$queryRaw<Array<{discipline:string;pointType:string;label:string|null}>>(Prisma.sql`SELECT discipline,pointType,label FROM SurveyPoint WHERE id=${input.surveyPointId} AND organizationId=${organizationId} AND sessionId=${input.sessionId} LIMIT 1`);
 if(!points[0])throw new Error("Survey point not found");
 const drafts=await prisma.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT id FROM SurveyFloorPlanDraft WHERE id=${input.draftId} AND organizationId=${organizationId} AND sessionId=${input.sessionId} LIMIT 1`);
 if(!drafts[0])throw new Error("Floor plan draft not found");
 await prisma.$executeRaw(Prisma.sql`INSERT INTO SurveyFloorPlanItem (id,organizationId,floorPlanDraftId,surveyPointId,discipline,pointType,label,normalizedX,normalizedY,createdAt,updatedAt) VALUES (${randomUUID()},${organizationId},${input.draftId},${input.surveyPointId},${points[0].discipline},${points[0].pointType},${points[0].label},${input.normalizedX},${input.normalizedY},NOW(3),NOW(3)) ON DUPLICATE KEY UPDATE normalizedX=VALUES(normalizedX),normalizedY=VALUES(normalizedY),label=VALUES(label),updatedAt=NOW(3)`);
}

export async function saveSurveyFloorPlanGeometry(actor:CommercialActor,input:{organizationId:string;sessionId:string;draftId:string;geometryJson:string;calibrationJson?:string|null}){
 const organizationId=requireScopedFieldWriteAccess(actor,input.organizationId.trim());
 JSON.parse(input.geometryJson);if(input.calibrationJson)JSON.parse(input.calibrationJson);
 const result=await prisma.$executeRaw(Prisma.sql`UPDATE SurveyFloorPlanDraft SET geometryJson=${input.geometryJson},calibrationJson=${input.calibrationJson??null},updatedAt=NOW(3) WHERE id=${input.draftId} AND organizationId=${organizationId} AND sessionId=${input.sessionId}`);
 if(!result)throw new Error("Floor plan draft not found");
}


export async function updateSurveyPointFloorPosition(actor:CommercialActor,input:{organizationId:string;sessionId:string;draftId:string;itemId:string;normalizedX:number;normalizedY:number}){
 const organizationId=requireScopedFieldWriteAccess(actor,input.organizationId.trim());
 for(const coordinate of [input.normalizedX,input.normalizedY])if(!Number.isFinite(coordinate)||coordinate<0||coordinate>1)throw new Error("Floor plan coordinates must be between 0 and 1");
 const result=await prisma.$executeRaw(Prisma.sql`UPDATE SurveyFloorPlanItem i JOIN SurveyFloorPlanDraft d ON d.id=i.floorPlanDraftId AND d.organizationId=i.organizationId SET i.normalizedX=${input.normalizedX},i.normalizedY=${input.normalizedY},i.updatedAt=NOW(3) WHERE i.id=${input.itemId} AND i.organizationId=${organizationId} AND i.floorPlanDraftId=${input.draftId} AND d.sessionId=${input.sessionId}`);
 if(!result)throw new Error("Floor plan point not found");
}


export async function createSurveyMeasurement(actor:CommercialActor,input:{organizationId:string;sessionId:string;areaId?:string|null;floorPlanDraftId?:string|null;measurementType?:"DISTANCE"|"HEIGHT"|"CEILING_HEIGHT"|"PATHWAY";label:string;value:number;unit:"FT"|"IN"|"M"|"CM";startX?:number|null;startY?:number|null;endX?:number|null;endY?:number|null;notes?:string|null;userId:string}){
 const organizationId=requireScopedFieldWriteAccess(actor,input.organizationId.trim());
 if(!Number.isFinite(input.value)||input.value<=0||input.value>100000)throw new Error("Measurement must be greater than zero");
 const coords=[input.startX,input.startY,input.endX,input.endY];for(const n of coords)if(n!=null&&(!Number.isFinite(n)||n<0||n>1))throw new Error("Measurement coordinates must be between 0 and 1");
 if(input.areaId){const area=await prisma.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT id FROM SurveyArea WHERE id=${input.areaId} AND sessionId=${input.sessionId} AND organizationId=${organizationId} LIMIT 1`);if(!area[0])throw new Error("Measurement area must belong to the same survey session");}\n if(input.floorPlanDraftId){const draft=await prisma.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT id FROM SurveyFloorPlanDraft WHERE id=${input.floorPlanDraftId} AND sessionId=${input.sessionId} AND organizationId=${organizationId} LIMIT 1`);if(!draft[0])throw new Error("Measurement floor plan must belong to the same survey session");}\n const id=randomUUID();\n const result=await prisma.$executeRaw(Prisma.sql`INSERT INTO SurveyMeasurement (id,organizationId,sessionId,areaId,floorPlanDraftId,measurementType,label,value,unit,startX,startY,endX,endY,notes,createdByUserId,createdAt,updatedAt) SELECT ${id},${organizationId},ss.id,${input.areaId??null},${input.floorPlanDraftId??null},${input.measurementType??"DISTANCE"},${clean(input.label,"Measurement label")},${input.value},${input.unit},${input.startX??null},${input.startY??null},${input.endX??null},${input.endY??null},${input.notes?.trim()||null},${input.userId},NOW(3),NOW(3) FROM SurveySession ss WHERE ss.id=${input.sessionId} AND ss.organizationId=${organizationId}`);
 if(!result)throw new Error("Survey session not found");return id;
}


export async function linkSurveyPhotoToArea(actor:CommercialActor,input:{organizationId:string;sessionId:string;areaId:string;assetId:string;viewLabel?:string|null;userId:string}){
 const organizationId=requireScopedFieldWriteAccess(actor,input.organizationId.trim());
 const rows=await prisma.$queryRaw<Array<{ok:number}>>(Prisma.sql`SELECT 1 AS ok FROM SurveyArea a JOIN SurveyAsset s ON s.sessionId=a.sessionId AND s.organizationId=a.organizationId WHERE a.id=${input.areaId} AND s.id=${input.assetId} AND a.sessionId=${input.sessionId} AND a.organizationId=${organizationId} LIMIT 1`);
 if(!rows[0])throw new Error("Photo and area must belong to the same survey session");
 await prisma.$executeRaw(Prisma.sql`INSERT INTO SurveyPhotoAreaLink (id,organizationId,sessionId,areaId,assetId,viewLabel,sortOrder,createdByUserId,createdAt) VALUES (${randomUUID()},${organizationId},${input.sessionId},${input.areaId},${input.assetId},${input.viewLabel?.trim()||null},(SELECT COALESCE(MAX(x.sortOrder),-1)+1 FROM SurveyPhotoAreaLink x WHERE x.organizationId=${organizationId} AND x.areaId=${input.areaId}),${input.userId},NOW(3)) ON DUPLICATE KEY UPDATE viewLabel=VALUES(viewLabel)`);
}
