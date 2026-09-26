"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRoles, requireUser } from "@/lib/auth";
import { requireFieldSurveyWriteAccess, requireFieldWorkOrderWriteAccess } from "@/lib/contractor-os/field-technician-access";
import { completeSurveySession, createSurveyArea, createSurveyAssignment, createSurveyMeasurement, createSurveyPoint, linkSurveyPhotoToArea, persistSurveyAsset, placeSurveyPointOnFloorPlan, saveSurveyFloorPlanGeometry, startSurveySession, updateSurveyChecklistResponse, updateSurveyPointFloorPosition } from "@/lib/contractor-os/site-survey-repository";
import { surveyPhotoStorageKey, validateSurveyPhoto } from "@/lib/contractor-os/site-survey-photo";
import { validateWorkOrderEvidence, workOrderEvidenceStorageKey } from "@/lib/contractor-os/work-order-evidence";
import { deletePrivateDesignAsset, storePrivateDesignAsset } from "@/lib/contractor-os/private-design-storage";
import { parseSurveyDisciplines, SURVEY_DISCIPLINES, type SurveyDiscipline } from "@/lib/contractor-os/site-survey";
import { routeAccess } from "@/lib/rbac";
import { handoffSurveyToDesignStudio } from "@/lib/contractor-os/site-survey-design-handoff";
import { assignWorkOrderTechnician, closeWorkOrder, createPunchListItem, generateCloseoutPackageManifest, persistWorkOrderEvidence, recordFinalAcceptance, resolvePunchListItem, recordCustomerFloorPlanDecision, submitFloorPlanForCustomerApproval, updateWorkOrderItem } from "@/lib/contractor-os/project-approval-work-order";
import { saveWorkOrderFloorCloseout, updateCableRunExecution } from "@/lib/contractor-os/cable-run-execution";
import { saveWorkOrderCloseoutRequirement } from "@/lib/contractor-os/closeout-requirements";

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


function surveyOrganization(user:{role:string;organizationId?:string|null},requested:string){return user.role==="CLIENT_ADMIN"||user.role==="VIEWER"?user.organizationId??"":requested;}
async function fieldUser(){return requireUser();}
async function allowSurveyFieldAction(user:Awaited<ReturnType<typeof requireUser>>,organizationId:string,sessionId:string){await requireFieldSurveyWriteAccess({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId,sessionId});}
async function allowWorkOrderFieldAction(user:Awaited<ReturnType<typeof requireUser>>,organizationId:string,sessionId:string,workOrderId:string){await requireFieldWorkOrderWriteAccess({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId,sessionId,workOrderId});}

export async function updateSurveyChecklistAction(formData:FormData){
  const user=await fieldUser();const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
  await allowSurveyFieldAction(user,organizationId,value(formData,"sessionId"));
  const status=value(formData,"status");if(!["PENDING","PASS","FAIL","NA"].includes(status))throw new Error("Invalid checklist status");
  await updateSurveyChecklistResponse({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),itemKey:value(formData,"itemKey"),status:status as "PENDING"|"PASS"|"FAIL"|"NA",notes:value(formData,"notes")||null,userId:user.id});
  revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}

export async function createSurveyAreaAction(formData:FormData){
  const user=await fieldUser();const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
  await allowSurveyFieldAction(user,organizationId,value(formData,"sessionId"));
  await createSurveyArea({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),name:value(formData,"name"),areaType:value(formData,"areaType")||"AREA"});
  revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}

export async function createSurveyPointAction(formData:FormData){
  const user=await fieldUser();const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
  await allowSurveyFieldAction(user,organizationId,value(formData,"sessionId"));
  const discipline=value(formData,"discipline");if(!SURVEY_DISCIPLINES.includes(discipline as SurveyDiscipline))throw new Error("Invalid survey discipline");
  const x=value(formData,"normalizedX"),y=value(formData,"normalizedY");
  await createSurveyPoint({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),areaId:value(formData,"areaId")||null,assetId:value(formData,"assetId")||null,discipline:discipline as SurveyDiscipline,pointType:value(formData,"pointType"),lifecycle:value(formData,"lifecycle")==="EXISTING"?"EXISTING":"PROPOSED",label:value(formData,"label")||null,normalizedX:x?Number(x):null,normalizedY:y?Number(y):null,notes:value(formData,"notes")||null,userId:user.id});
  revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}

export async function uploadSurveyPhotoAction(formData:FormData){
  const user=await fieldUser();const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
  await allowSurveyFieldAction(user,organizationId,value(formData,"sessionId"));
  const sessionId=value(formData,"sessionId"),uploaded=formData.get("photo");if(!(uploaded instanceof File)||!uploaded.name)throw new Error("Take or select a survey photo");
  const bytes=new Uint8Array(await uploaded.arrayBuffer());const asset=validateSurveyPhoto({fileName:uploaded.name,mimeType:uploaded.type,bytes});const storageKey=surveyPhotoStorageKey(organizationId,sessionId,asset.assetId,asset.extension);
  await storePrivateDesignAsset(storageKey,bytes);
  try{await persistSurveyAsset({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId,sessionId,areaId:value(formData,"areaId")||null,assetId:asset.assetId,originalName:asset.originalName,mimeType:asset.mimeType,storageKey,byteSize:asset.byteSize,sha256:asset.sha256,userId:user.id});}catch(error){await deletePrivateDesignAsset(storageKey);throw error;}
  revalidatePath(`/site-surveys/${sessionId}`);
}

export async function completeSurveySessionAction(formData:FormData){
  const user=await fieldUser();const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
  await allowSurveyFieldAction(user,organizationId,value(formData,"sessionId"));
  await completeSurveySession({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId")});revalidatePath("/site-surveys");redirect(`/site-surveys?organizationId=${encodeURIComponent(organizationId)}`);
}


export async function placeSurveyPointOnFloorPlanAction(formData:FormData){
 const user=await fieldUser();const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 await allowSurveyFieldAction(user,organizationId,value(formData,"sessionId"));
 await placeSurveyPointOnFloorPlan({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),draftId:value(formData,"draftId"),surveyPointId:value(formData,"surveyPointId"),normalizedX:Number(value(formData,"normalizedX")),normalizedY:Number(value(formData,"normalizedY"))});
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}

export async function saveSurveyFloorPlanGeometryAction(formData:FormData){
 const user=await fieldUser();const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 await allowSurveyFieldAction(user,organizationId,value(formData,"sessionId"));
 await saveSurveyFloorPlanGeometry({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),draftId:value(formData,"draftId"),geometryJson:value(formData,"geometryJson"),calibrationJson:value(formData,"calibrationJson")||null});
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}


export async function updateSurveyPointFloorPositionAction(formData:FormData){
 const user=await fieldUser();const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 await allowSurveyFieldAction(user,organizationId,value(formData,"sessionId"));
 await updateSurveyPointFloorPosition({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),draftId:value(formData,"draftId"),itemId:value(formData,"itemId"),normalizedX:Number(value(formData,"normalizedX")),normalizedY:Number(value(formData,"normalizedY"))});
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}


export async function createSurveyMeasurementAction(formData:FormData){
 const user=await fieldUser();const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
  await allowSurveyFieldAction(user,organizationId,value(formData,"sessionId"));
 const unit=value(formData,"unit");if(!["FT","IN","M","CM"].includes(unit))throw new Error("Invalid measurement unit");
 const type=value(formData,"measurementType");if(!["DISTANCE","HEIGHT","CEILING_HEIGHT","PATHWAY"].includes(type))throw new Error("Invalid measurement type");
 const number=(key:string)=>{const raw=value(formData,key);return raw===""?null:Number(raw)};
 await createSurveyMeasurement({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),areaId:value(formData,"areaId")||null,floorPlanDraftId:value(formData,"floorPlanDraftId")||null,measurementType:type as "DISTANCE"|"HEIGHT"|"CEILING_HEIGHT"|"PATHWAY",label:value(formData,"label"),value:Number(value(formData,"measurementValue")),unit:unit as "FT"|"IN"|"M"|"CM",startX:number("startX"),startY:number("startY"),endX:number("endX"),endY:number("endY"),notes:value(formData,"notes")||null,userId:user.id});
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}


export async function linkSurveyPhotoToAreaAction(formData:FormData){
 const user=await fieldUser();const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
  await allowSurveyFieldAction(user,organizationId,value(formData,"sessionId"));
 await linkSurveyPhotoToArea({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),areaId:value(formData,"areaId"),assetId:value(formData,"assetId"),viewLabel:value(formData,"viewLabel")||null,userId:user.id});
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}


export async function handoffSurveyToDesignStudioAction(formData:FormData){
 const user=await requireRoles(routeAccess.siteSurveys);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 const result=await handoffSurveyToDesignStudio({id:user.id,role:user.role,organizationId:user.organizationId,groups:[]},{organizationId,sessionId:value(formData,"sessionId"),draftId:value(formData,"draftId"),userId:user.id});
 redirect(`/design-studio/${result.designProjectId}?organizationId=${encodeURIComponent(organizationId)}`);
}


export async function submitFloorPlanForCustomerApprovalAction(formData:FormData){
 const user=await requireRoles(routeAccess.siteSurveys);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 await submitFloorPlanForCustomerApproval({role:user.role,organizationId:user.organizationId},{organizationId,sessionId:value(formData,"sessionId"),draftId:value(formData,"draftId"),userId:user.id,customerName:value(formData,"customerName")||null,customerEmail:value(formData,"customerEmail")||null});
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}
export async function recordCustomerFloorPlanDecisionAction(formData:FormData){
 const user=await requireRoles(routeAccess.siteSurveys);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 await recordCustomerFloorPlanDecision({role:user.role,organizationId:user.organizationId},{organizationId,approvalId:value(formData,"approvalId"),approved:value(formData,"decision")==="APPROVE",customerName:value(formData,"customerName"),customerNote:value(formData,"customerNote")||null,userId:user.id});
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}


export async function updateWorkOrderItemAction(formData:FormData){
 const user=await fieldUser();const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
  await allowWorkOrderFieldAction(user,organizationId,value(formData,"sessionId"),value(formData,"workOrderId"));
 await updateWorkOrderItem({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId,workOrderId:value(formData,"workOrderId"),itemId:value(formData,"itemId"),pulledInstalled:formData.get("pulledInstalled")==="on",terminated:formData.get("terminated")==="on",testStatus:value(formData,"testStatus")||null,technicianNote:value(formData,"technicianNote")||null,userId:user.id});
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}


export async function uploadWorkOrderEvidenceAction(formData:FormData){
 const user=await fieldUser();const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
  await allowWorkOrderFieldAction(user,organizationId,value(formData,"sessionId"),value(formData,"workOrderId"));
 const file=formData.get("photo");if(!(file instanceof File))throw new Error("Evidence photo is required");const bytes=new Uint8Array(await file.arrayBuffer());const validated=validateWorkOrderEvidence({fileName:file.name,mimeType:file.type,bytes});const workOrderId=value(formData,"workOrderId"),itemId=value(formData,"itemId");const storageKey=workOrderEvidenceStorageKey(organizationId,workOrderId,itemId,validated.evidenceId,validated.extension);
 const requestedType=value(formData,"evidenceType").toUpperCase();const evidenceType=["BEFORE","AFTER","TESTER","WORK_AREA"].includes(requestedType)?requestedType as "BEFORE"|"AFTER"|"TESTER"|"WORK_AREA":"PHOTO";await storePrivateDesignAsset(storageKey,bytes);try{await persistWorkOrderEvidence({id:user.id,role:user.role,organizationId:user.organizationId},{organizationId,workOrderId,itemId,evidenceId:validated.evidenceId,evidenceType,originalName:validated.originalName,mimeType:validated.mimeType,byteSize:validated.byteSize,storageKey,sha256:validated.sha256,caption:value(formData,"caption")||null,userId:user.id});}catch(error){await deletePrivateDesignAsset(storageKey).catch(()=>undefined);throw error;}
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}


export async function assignWorkOrderTechnicianAction(formData:FormData){
 const user=await requireRoles(["SUPER_ADMIN","INTERNAL_ADMIN","CLIENT_ADMIN"]);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 await assignWorkOrderTechnician({role:user.role,organizationId:user.organizationId},{organizationId,workOrderId:value(formData,"workOrderId"),technicianUserId:value(formData,"technicianUserId"),userId:user.id});
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}


export async function createPunchListItemAction(formData:FormData){
 const user=await requireRoles(routeAccess.siteSurveys);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 await createPunchListItem({role:user.role,organizationId:user.organizationId},{organizationId,workOrderId:value(formData,"workOrderId"),workOrderItemId:value(formData,"workOrderItemId")||null,title:value(formData,"title"),description:value(formData,"description")||null,severity:value(formData,"severity")||"NORMAL",assignedToUserId:value(formData,"assignedToUserId")||null,userId:user.id});revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}
export async function resolvePunchListItemAction(formData:FormData){
 const user=await requireRoles(routeAccess.siteSurveys);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 await resolvePunchListItem({role:user.role,organizationId:user.organizationId},{organizationId,workOrderId:value(formData,"workOrderId"),punchListItemId:value(formData,"punchListItemId"),resolutionNote:value(formData,"resolutionNote")||null,userId:user.id});revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}


export async function recordFinalAcceptanceAction(formData:FormData){
 const user=await requireRoles(["SUPER_ADMIN","INTERNAL_ADMIN","CLIENT_ADMIN"]);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 await recordFinalAcceptance({role:user.role,organizationId:user.organizationId},{organizationId,workOrderId:value(formData,"workOrderId"),customerName:value(formData,"customerName"),customerEmail:value(formData,"customerEmail")||null,customerNote:value(formData,"customerNote")||null,accepted:value(formData,"decision")==="ACCEPTED",userId:user.id});revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}
export async function closeWorkOrderAction(formData:FormData){
 const user=await requireRoles(["SUPER_ADMIN","INTERNAL_ADMIN","CLIENT_ADMIN"]);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 await closeWorkOrder({role:user.role,organizationId:user.organizationId},{organizationId,workOrderId:value(formData,"workOrderId"),userId:user.id});revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}
export async function generateCloseoutPackageAction(formData:FormData){
 const user=await requireRoles(["SUPER_ADMIN","INTERNAL_ADMIN","CLIENT_ADMIN"]);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 await generateCloseoutPackageManifest({role:user.role,organizationId:user.organizationId},{organizationId,workOrderId:value(formData,"workOrderId"),userId:user.id});revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
}


export async function updateCableRunExecutionAction(formData:FormData){
 const user=await fieldUser();const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 const sessionId=value(formData,"sessionId"),workOrderId=value(formData,"workOrderId");
 await allowWorkOrderFieldAction(user,organizationId,sessionId,workOrderId);
 const number=(key:string)=>{const raw=value(formData,key);return raw?Number(raw):null;};
 const result=(key:string)=>{const raw=value(formData,key);return raw?raw as "PASS"|"FAIL"|"NA":null;};
 await updateCableRunExecution({id:user.id,role:user.role,organizationId:user.organizationId},{
  organizationId,workOrderId,itemId:value(formData,"itemId"),runIdentifier:value(formData,"runIdentifier"),
  scopeType:value(formData,"scopeType")==="EXISTING"?"EXISTING":"NEW",fromLocation:value(formData,"fromLocation")||null,
  toLocation:value(formData,"toLocation")||null,cableType:value(formData,"cableType")||null,measuredLength:number("measuredLength"),
  lengthUnit:value(formData,"lengthUnit")==="M"?"M":"FT",floorLevel:value(formData,"floorLevel")||null,
  terminationPoint:value(formData,"terminationPoint")||null,deviceLocation:value(formData,"deviceLocation")||null,
  deviceType:value(formData,"deviceType")||null,pulledInstalled:formData.get("pulledInstalled")==="on",
  terminatedEndA:formData.get("terminatedEndA")==="on",terminatedEndB:formData.get("terminatedEndB")==="on",labeled:formData.get("labeled")==="on",wiremapStatus:result("wiremapStatus"),
  gigabitLinkStatus:result("gigabitLinkStatus"),overallTestStatus:result("overallTestStatus"),
  technicianNote:value(formData,"technicianNote")||null,userId:user.id
 });
 revalidatePath(`/site-surveys/${sessionId}`);
}


export async function saveCloseoutRequirementsAction(formData:FormData){
 const user=await requireRoles(["SUPER_ADMIN","INTERNAL_ADMIN","CLIENT_ADMIN"]);const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 const date=value(formData,"warrantyStartDate");
 await saveWorkOrderCloseoutRequirement({role:user.role,organizationId:user.organizationId},{organizationId,workOrderId:value(formData,"workOrderId"),requireDailyClose:formData.get("requireDailyClose")==="on",requireMaterialReturnAcknowledgement:formData.get("requireMaterialReturnAcknowledgement")==="on",requireWorkAreaPhotos:formData.get("requireWorkAreaPhotos")==="on",requireTesterEvidenceForNewRuns:formData.get("requireTesterEvidenceForNewRuns")==="on",warrantyRequired:formData.get("warrantyRequired")==="on",warrantyStartDate:date?new Date(date+"T00:00:00"):null,warrantyTerms:value(formData,"warrantyTerms")||null,materialReturnRequired:formData.get("materialReturnRequired")==="on",materialReturnAcknowledged:formData.get("materialReturnAcknowledged")==="on",materialReturnNote:value(formData,"materialReturnNote")||null,toolsRemoved:formData.get("toolsRemoved")==="on",corridorsClear:formData.get("corridorsClear")==="on",workAreaPhotosSaved:formData.get("workAreaPhotosSaved")==="on",buildingSecured:formData.get("buildingSecured")==="on",technicianSignOffName:value(formData,"technicianSignOffName")||null,technicianSignedOff:formData.get("technicianSignedOff")==="on",userId:user.id});
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}`);
 revalidatePath(`/site-surveys/${value(formData,"sessionId")}/closeout`);
}


export async function saveFloorCloseoutAction(formData:FormData){
 const user=await fieldUser();const organizationId=surveyOrganization(user,value(formData,"organizationId"));if(!organizationId)throw new Error("Organization context is required");
 const sessionId=value(formData,"sessionId"),workOrderId=value(formData,"workOrderId");
 await allowWorkOrderFieldAction(user,organizationId,sessionId,workOrderId);
 await saveWorkOrderFloorCloseout({id:user.id,role:user.role,organizationId:user.organizationId},{
  organizationId,workOrderId,floorLevel:value(formData,"floorLevel"),
  cableSupportPassed:formData.get("cableSupportPassed")==="on",
  racewayConduitPassed:formData.get("racewayConduitPassed")==="on",
  firestopPassed:formData.get("firestopPassed")==="on",
  labelReconciliationPassed:formData.get("labelReconciliationPassed")==="on",
  cleanupPassed:formData.get("cleanupPassed")==="on",
  workAreaPhotosSaved:formData.get("workAreaPhotosSaved")==="on",
  notes:value(formData,"notes")||null,userId:user.id
 });
 revalidatePath(`/site-surveys/${sessionId}`);
}
