export type CloseoutCableRun = {
  runIdentifier:string; floorLevel:string|null; deviceLocation:string|null; deviceType:string|null; scopeType:"NEW"|"EXISTING";
  measuredLength:number|null; lengthUnit:string|null; wiremapStatus:string|null; gigabitLinkStatus:string|null; overallTestStatus:string|null;
  evidenceFiles:string[]; acceptanceStatus:string|null;
};
export type CloseoutPunchItem={id:string;runIdentifier?:string|null;title:string;status:string;severity:string};
export type CloseoutPhoto={id:string;fileName:string;caption?:string|null;category:"BEFORE"|"AFTER"|"TESTER"|"WORK_AREA"|"OTHER"};
export type CloseoutPackageModel={
  project:{name:string;siteName?:string|null;workOrderNumber?:string|null;customerName?:string|null};
  completedScope:string[]; cableSchedule:CloseoutCableRun[]; deviceList:Array<{id:string;label:string;type:string;location?:string|null}>;
  photos:CloseoutPhoto[]; punchList:CloseoutPunchItem[]; acceptance:{ready:number;accepted:number;rejected:number;openPunch:number};
  dailyClose?:{toolsRemoved:boolean;corridorsClear:boolean;workAreaPhotosSaved:boolean;buildingSecured:boolean;verifiedBy?:string|null;verifiedAt?:string|null};
  materialReturn?:{required:boolean;acknowledged:boolean;note?:string|null}; warranty?:{startDate?:string|null;terms?:string|null};
  signOff?:{technicianName?:string|null;technicianDate?:string|null;customerName?:string|null;customerDate?:string|null};
  commercial?:{acceptedUnitRate?:number|null;acceptedValue?:number|null;currency?:string;invoiceId?:string|null;waiverReference?:string|null};
  warnings:string[];
};
export type CloseoutRequirements={requireTesterEvidenceForNewRuns:boolean;requireDailyClose:boolean;requireMaterialReturnAcknowledgement:boolean;includeAcceptedValue:boolean};
export const DEFAULT_CLOSEOUT_REQUIREMENTS:CloseoutRequirements={requireTesterEvidenceForNewRuns:true,requireDailyClose:false,requireMaterialReturnAcknowledgement:false,includeAcceptedValue:false};

export function buildCloseoutPackage(input:Omit<CloseoutPackageModel,"acceptance"|"warnings">,requirements:CloseoutRequirements=DEFAULT_CLOSEOUT_REQUIREMENTS):CloseoutPackageModel{
 const warnings:string[]=[];
 for(const run of input.cableSchedule){
  if(run.scopeType==="NEW"&&requirements.requireTesterEvidenceForNewRuns&&run.overallTestStatus==="PASS"&&!run.evidenceFiles.length)warnings.push(`Tester evidence missing for ${run.runIdentifier}.`);
  if(run.acceptanceStatus==="ACCEPTED"&&run.overallTestStatus!=="PASS")warnings.push(`Accepted run ${run.runIdentifier} does not have an overall PASS result.`);
 }
 if(requirements.requireDailyClose&&!input.dailyClose)warnings.push("Daily-close verification is required.");
 if(requirements.requireMaterialReturnAcknowledgement&&input.materialReturn?.required&&!input.materialReturn.acknowledged)warnings.push("Unused furnished-material return acknowledgement is required.");
 const ready=input.cableSchedule.filter(r=>r.acceptanceStatus==="READY").length;
 const accepted=input.cableSchedule.filter(r=>r.acceptanceStatus==="ACCEPTED").length;
 const rejected=input.cableSchedule.filter(r=>r.acceptanceStatus==="REJECTED").length;
 const openPunch=input.punchList.filter(p=>p.status==="OPEN").length;
 const commercial={...input.commercial};
 if(requirements.includeAcceptedValue&&commercial.acceptedUnitRate!=null)commercial.acceptedValue=Math.round(accepted*commercial.acceptedUnitRate*100)/100;
 else delete commercial.acceptedValue;
 return {...input,commercial,acceptance:{ready,accepted,rejected,openPunch},warnings};
}
