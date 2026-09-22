"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRoles } from "@/lib/auth";
import { completeSurveySession, createSurveyArea, createSurveyAssignment, createSurveyMeasurement, createSurveyPoint, persistSurveyAsset, placeSurveyPointOnFloorPlan, saveSurveyFloorPlanGeometry, startSurveySession, updateSurveyChecklistResponse, updateSurveyPointFloorPosition } from "@/lib/contractor-os/site-survey-repository";
import { surveyPhotoStorageKey, validateSurveyPhoto } from "@/lib/contractor-os/site-survey-photo";
import { deletePrivateDesignAsset, storePrivateDesignAsset } from "@/lib/contractor-os/private-design-storage";
import { parseSurveyDisciplines, SURVEY_DISCIPLINES, type SurveyDiscipline } from "@/lib/contractor-os/site-survey";
import { routeAccess } from "@/lib/rbac";

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

export async function createSurveyAssignmentAction(formData: FormData) {
  const user = await requireRoles(routeAccess.siteSurveys);
  const requestedOrganizationId = value(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  if (!organizationId) throw new Error("Organization context is required");

  await createSurveyAssignment(
    { role: user.role, organizationId: user.organizationId },
    {
      organizationId,
      projectInstallationId: value(formData, "projectInstallationId"),
      siteId: value(formData, "siteId"),
      title: value(formData, "title"),
      disciplines: parseSurveyDisciplines(formData.getAll("disciplines").filter((v): v is string => typeof v === "string")),
      assignedToUserId: value(formData, "assignedToUserId") || null,
      assignedByUserId: user.id,
      instructions: value(formData, "instructions") || null,
    },
  );
  revalidatePath("/site-surveys");
  redirect(`/site-surveys?organizationId=${encodeURIComponent(organizationId)}`);
}

export async function startSurveySessionAction(formData: FormData) {
  const user = await requireRoles(routeAccess.siteSurveys);
  const requestedOrganizationId = value(formData, "organizationId");
  const organizationId = user.role === "CLIENT_ADMIN" ? user.organizationId ?? "" : requestedOrganizationId;
  if (!organizationId) throw new Error("Organization context is required");
  const sessionId = await startSurveySession(
    { role: user.role, organizationId: user.organizationId },
    { organizationId, assignmentId: value(formData, "assignmentId"), technicianUserId: user.id },
  );
  revalidatePath("/site-surveys");
  redirect(`/site-surveys/${sessionId}?organizationId=${encodeURIComponent(organizationId)}`);
}


function surveyOrganization(user:{role:string;organizationId?:string|null},requested:string){return user.role==="CLIENT_ADMIN"?user.organizationId??"":requested;}

export async function updateSurveyChecklistAction(formData:FormData){
  const user=await requireRoles(routeAccess.siteSurveys);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
  const status=value(formData,"status");if(!["PENDING","PASS","FAIL","NA"].includes(status))throw new Error("Invalid checklist status");
  await updateSurveyChecklistResponse({role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),itemKey:value(formData,"itemKey"),status:status as "PENDING"|"PASS"|"FAIL"|"NA",notes:value(formData,"notes")||null,userId:user.id});
  revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}

export async function createSurveyAreaAction(formData:FormData){
  const user=await requireRoles(routeAccess.siteSurveys);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
  await createSurveyArea({role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),name:value(formData,"name"),areaType:value(formData,"areaType")||"AREA"});
  revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}

export async function createSurveyPointAction(formData:FormData){
  const user=await requireRoles(routeAccess.siteSurveys);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
  const discipline=value(formData,"discipline");if(!SURVEY_DISCIPLINES.includes(discipline as SurveyDiscipline))throw new Error("Invalid survey discipline");
  const x=value(formData,"normalizedX"),y=value(formData,"normalizedY");
  await createSurveyPoint({role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),areaId:value(formData,"areaId")||null,assetId:value(formData,"assetId")||null,discipline:discipline as SurveyDiscipline,pointType:value(formData,"pointType"),lifecycle:value(formData,"lifecycle")==="EXISTING"?"EXISTING":"PROPOSED",label:value(formData,"label")||null,normalizedX:x?Number(x):null,normalizedY:y?Number(y):null,notes:value(formData,"notes")||null,userId:user.id});
  revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}

export async function uploadSurveyPhotoAction(formData:FormData){
  const user=await requireRoles(routeAccess.siteSurveys);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
  const sessionId=value(formData,"sessionId"),uploaded=formData.get("photo");if(!(uploaded instanceof File)||!uploaded.name)throw new Error("Take or select a survey photo");
  const bytes=new Uint8Array(await uploaded.arrayBuffer());const asset=validateSurveyPhoto({fileName:uploaded.name,mimeType:uploaded.type,bytes});const storageKey=surveyPhotoStorageKey(organizationId,sessionId,asset.assetId,asset.extension);
  await storePrivateDesignAsset(storageKey,bytes);
  try{await persistSurveyAsset({role:user.role,organizationId:user.organizationId},{organizationId,sessionId,areaId:value(formData,"areaId")||null,assetId:asset.assetId,originalName:asset.originalName,mimeType:asset.mimeType,storageKey,byteSize:asset.byteSize,sha256:asset.sha256,userId:user.id});}catch(error){await deletePrivateDesignAsset(storageKey);throw error;}
  revalidatePath(`/site-surveys/${sessionId}`);
}

export async function completeSurveySessionAction(formData:FormData){
  const user=await requireRoles(routeAccess.siteSurveys);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
  await completeSurveySession({role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId")});revalidatePath("/site-surveys");redirect(`/site-surveys?organizationId=${encodeURIComponent(organizationId)}`);
}


export async function placeSurveyPointOnFloorPlanAction(formData:FormData){
 const user=await requireRoles(routeAccess.siteSurveys);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 await placeSurveyPointOnFloorPlan({role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),draftId:value(formData,"draftId"),surveyPointId:value(formData,"surveyPointId"),normalizedX:Number(value(formData,"normalizedX")),normalizedY:Number(value(formData,"normalizedY"))});
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}

export async function saveSurveyFloorPlanGeometryAction(formData:FormData){
 const user=await requireRoles(routeAccess.siteSurveys);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 await saveSurveyFloorPlanGeometry({role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),draftId:value(formData,"draftId"),geometryJson:value(formData,"geometryJson"),calibrationJson:value(formData,"calibrationJson")||null});
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}


export async function updateSurveyPointFloorPositionAction(formData:FormData){
 const user=await requireRoles(routeAccess.siteSurveys);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 await updateSurveyPointFloorPosition({role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),draftId:value(formData,"draftId"),itemId:value(formData,"itemId"),normalizedX:Number(value(formData,"normalizedX")),normalizedY:Number(value(formData,"normalizedY"))});
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}


export async function createSurveyMeasurementAction(formData:FormData){
 const user=await requireRoles(routeAccess.siteSurveys);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 const unit=value(formData,"unit");if(!["FT","IN","M","CM"].includes(unit))throw new Error("Invalid measurement unit");
 const type=value(formData,"measurementType");if(!["DISTANCE","HEIGHT","CEILING_HEIGHT","PATHWAY"].includes(type))throw new Error("Invalid measurement type");
 const number=(key:string)=>{const raw=value(formData,key);return raw===""?null:Number(raw)};
 await createSurveyMeasurement({role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),areaId:value(formData,"areaId")||null,floorPlanDraftId:value(formData,"floorPlanDraftId")||null,measurementType:type as "DISTANCE"|"HEIGHT"|"CEILING_HEIGHT"|"PATHWAY",label:value(formData,"label"),value:Number(value(formData,"measurementValue")),unit:unit as "FT"|"IN"|"M"|"CM",startX:number("startX"),startY:number("startY"),endX:number("endX"),endY:number("endY"),notes:value(formData,"notes")||null,userId:user.id});
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}
