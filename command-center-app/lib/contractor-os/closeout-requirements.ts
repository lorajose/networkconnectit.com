import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CommercialActor } from "@/lib/contractor-os/commercial-access";
import { requireCommercialWriteAccess } from "@/lib/contractor-os/commercial-access";
import { requireOpenWorkOrder } from "@/lib/contractor-os/work-order-lifecycle";

export type WorkOrderCloseoutRequirement={
 id:string;organizationId:string;workOrderId:string;requireDailyClose:boolean;requireMaterialReturnAcknowledgement:boolean;requireWorkAreaPhotos:boolean;requireTesterEvidenceForNewRuns:boolean;
 warrantyRequired:boolean;warrantyStartDate:Date|null;warrantyTerms:string|null;materialReturnRequired:boolean;materialReturnAcknowledged:boolean;materialReturnNote:string|null;
 toolsRemoved:boolean|null;corridorsClear:boolean|null;workAreaPhotosSaved:boolean|null;buildingSecured:boolean|null;dailyCloseVerifiedByUserId:string|null;dailyCloseVerifiedAt:Date|null;
 technicianSignOffName:string|null;technicianSignOffAt:Date|null;
};

export async function getWorkOrderCloseoutRequirement(actor:CommercialActor,input:{organizationId:string;workOrderId:string}){
 const organizationId=input.organizationId.trim();if(actor.role==="CLIENT_ADMIN"||actor.role==="VIEWER"){if(actor.organizationId!==organizationId)throw new Error("Cross-tenant closeout requirement read denied");}
 const rows=await prisma.$queryRaw<WorkOrderCloseoutRequirement[]>(Prisma.sql`SELECT * FROM ProjectWorkOrderCloseoutRequirement WHERE organizationId=${organizationId} AND workOrderId=${input.workOrderId} LIMIT 1`);
 return rows[0]??null;
}

export async function saveWorkOrderCloseoutRequirement(actor:CommercialActor,input:{organizationId:string;workOrderId:string;requireDailyClose:boolean;requireMaterialReturnAcknowledgement:boolean;requireWorkAreaPhotos:boolean;requireTesterEvidenceForNewRuns:boolean;warrantyRequired:boolean;warrantyStartDate?:Date|null;warrantyTerms?:string|null;materialReturnRequired:boolean;materialReturnAcknowledged:boolean;materialReturnNote?:string|null;toolsRemoved?:boolean|null;corridorsClear?:boolean|null;workAreaPhotosSaved?:boolean|null;buildingSecured?:boolean|null;technicianSignOffName?:string|null;technicianSignedOff:boolean;userId:string}){
 const organizationId=requireCommercialWriteAccess(actor,input.organizationId.trim());
 const dailyComplete=input.toolsRemoved===true&&input.corridorsClear===true&&input.workAreaPhotosSaved===true&&input.buildingSecured===true;
 const id=randomUUID();await prisma.$transaction(async tx=>{await requireOpenWorkOrder(organizationId,input.workOrderId,tx,true);await tx.$executeRaw(Prisma.sql`INSERT INTO ProjectWorkOrderCloseoutRequirement (id,organizationId,workOrderId,requireDailyClose,requireMaterialReturnAcknowledgement,requireWorkAreaPhotos,requireTesterEvidenceForNewRuns,warrantyRequired,warrantyStartDate,warrantyTerms,materialReturnRequired,materialReturnAcknowledged,materialReturnNote,toolsRemoved,corridorsClear,workAreaPhotosSaved,buildingSecured,dailyCloseVerifiedByUserId,dailyCloseVerifiedAt,technicianSignOffName,technicianSignOffAt,createdAt,updatedAt) VALUES (${id},${organizationId},${input.workOrderId},${input.requireDailyClose},${input.requireMaterialReturnAcknowledgement},${input.requireWorkAreaPhotos},${input.requireTesterEvidenceForNewRuns},${input.warrantyRequired},${input.warrantyStartDate??null},${input.warrantyTerms?.trim()||null},${input.materialReturnRequired},${input.materialReturnAcknowledged},${input.materialReturnNote?.trim()||null},${input.toolsRemoved??null},${input.corridorsClear??null},${input.workAreaPhotosSaved??null},${input.buildingSecured??null},${dailyComplete?input.userId:null},${dailyComplete?new Date():null},${input.technicianSignOffName?.trim()||null},${input.technicianSignedOff?new Date():null},NOW(3),NOW(3)) ON DUPLICATE KEY UPDATE requireDailyClose=VALUES(requireDailyClose),requireMaterialReturnAcknowledgement=VALUES(requireMaterialReturnAcknowledgement),requireWorkAreaPhotos=VALUES(requireWorkAreaPhotos),requireTesterEvidenceForNewRuns=VALUES(requireTesterEvidenceForNewRuns),warrantyRequired=VALUES(warrantyRequired),warrantyStartDate=VALUES(warrantyStartDate),warrantyTerms=VALUES(warrantyTerms),materialReturnRequired=VALUES(materialReturnRequired),materialReturnAcknowledged=VALUES(materialReturnAcknowledged),materialReturnNote=VALUES(materialReturnNote),toolsRemoved=VALUES(toolsRemoved),corridorsClear=VALUES(corridorsClear),workAreaPhotosSaved=VALUES(workAreaPhotosSaved),buildingSecured=VALUES(buildingSecured),dailyCloseVerifiedByUserId=VALUES(dailyCloseVerifiedByUserId),dailyCloseVerifiedAt=VALUES(dailyCloseVerifiedAt),technicianSignOffName=VALUES(technicianSignOffName),technicianSignOffAt=VALUES(technicianSignOffAt),updatedAt=NOW(3)`);});
 return getWorkOrderCloseoutRequirement(actor,{organizationId,workOrderId:input.workOrderId});
}
