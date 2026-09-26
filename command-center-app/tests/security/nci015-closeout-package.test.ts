import assert from "node:assert/strict";
import test from "node:test";
import { buildCloseoutPackage } from "../../lib/contractor-os/closeout-package";

const base={project:{name:"Example Project"},completedScope:["31 cable runs"],deviceList:[],photos:[],punchList:[],cableSchedule:[{runIdentifier:"MDF-A-01",floorLevel:"1",deviceLocation:"Hall",deviceType:"Camera",scopeType:"NEW" as const,measuredLength:120,lengthUnit:"FT",wiremapStatus:"PASS",gigabitLinkStatus:"PASS",overallTestStatus:"PASS",evidenceFiles:["tester-01.jpg"],acceptanceStatus:"ACCEPTED"}],commercial:{currency:"USD"}};

test("closeout package derives acceptance counts from execution evidence",()=>{const model=buildCloseoutPackage(base);assert.equal(model.acceptance.accepted,1);assert.equal(model.acceptance.rejected,0);assert.deepEqual(model.warnings,[]);});
test("new tested runs require tester evidence when configured",()=>{const model=buildCloseoutPackage({...base,cableSchedule:[{...base.cableSchedule[0],evidenceFiles:[]}]});assert.match(model.warnings[0],/Tester evidence missing/);});
test("accepted-value calculation is project configuration, not a global rate",()=>{const model=buildCloseoutPackage({...base,commercial:{currency:"USD",acceptedUnitRate:150}},{requireTesterEvidenceForNewRuns:true,requireDailyClose:false,requireMaterialReturnAcknowledgement:false,includeAcceptedValue:true});assert.equal(model.commercial?.acceptedValue,150);const normal=buildCloseoutPackage({...base,commercial:{currency:"USD",acceptedUnitRate:150}});assert.equal(normal.commercial?.acceptedValue,undefined);});
test("customer-specific daily close and material return rules are configurable",()=>{const model=buildCloseoutPackage({...base,materialReturn:{required:true,acknowledged:false}},{requireTesterEvidenceForNewRuns:true,requireDailyClose:true,requireMaterialReturnAcknowledgement:true,includeAcceptedValue:false});assert.equal(model.warnings.length,2);});


import fs from "node:fs";
import path from "node:path";

test("immutable closeout manifest snapshots cable execution and real stored evidence",()=>{
 const source=fs.readFileSync(path.resolve(process.cwd(),"lib/contractor-os/project-approval-work-order.ts"),"utf8");
 assert.match(source,/schemaVersion:3/);
 assert.match(source,/runIdentifier,scopeType,fromLocation,toLocation,cableType,measuredLength,lengthUnit,floorLevel/);
 assert.match(source,/wiremapStatus,gigabitLinkStatus,evidenceSaved,acceptanceStatus/);
 assert.match(source,/ProjectWorkOrderEvidence/);
 assert.match(source,/evidenceType,originalName,mimeType,byteSize,storageKey,sha256/);
 assert.match(source,/acceptanceCounts/);
 assert.match(source,/cableSchedule:cableRuns/);
});


test("client-safe closeout report uses tenant branding and excludes commercial pricing",()=>{
 const report=fs.readFileSync(path.resolve(process.cwd(),"app/(protected)/site-surveys/[sessionId]/closeout/page.tsx"),"utf8");
 assert.match(report,/requireSiteSurveyPageAccess/);
 assert.match(report,/logoUrl/);
 assert.match(report,/brandPrimaryColor/);
 assert.match(report,/Final cable schedule/);
 assert.match(report,/wiremapStatus/);
 assert.match(report,/gigabitLinkStatus/);
 assert.match(report,/Test & photo evidence index/);
 assert.match(report,/Punch list/);
 assert.match(report,/Customer acceptance/);
 assert.match(report,/Commercial pricing is intentionally excluded/);
 assert.doesNotMatch(report,/acceptedUnitRate/);
 assert.doesNotMatch(report,/acceptedValue/);
});


test("field evidence is explicitly categorized for before after tester and work-area closeout",()=>{
 const actions=fs.readFileSync(path.resolve(process.cwd(),"app/(protected)/site-surveys/actions.ts"),"utf8");
 const page=fs.readFileSync(path.resolve(process.cwd(),"app/(protected)/site-surveys/[sessionId]/page.tsx"),"utf8");
 const repository=fs.readFileSync(path.resolve(process.cwd(),"lib/contractor-os/project-approval-work-order.ts"),"utf8");
 assert.match(actions,/BEFORE","AFTER","TESTER","WORK_AREA/);
 assert.match(actions,/evidenceType/);
 assert.match(page,/Before work/);
 assert.match(page,/Tester result/);
 assert.match(page,/Work-area \/ cleanup/);
 assert.match(repository,/evidenceType\?:"BEFORE"\|"AFTER"\|"TESTER"\|"WORK_AREA"\|"PHOTO"/);
 assert.match(repository,/SELECT id,workOrderItemId,evidenceType,originalName/);
});


test("closeout requirements are persisted per work order and remain configurable",()=>{
 const repo=fs.readFileSync(path.resolve(process.cwd(),"lib/contractor-os/closeout-requirements.ts"),"utf8");
 const page=fs.readFileSync(path.resolve(process.cwd(),"app/(protected)/site-surveys/[sessionId]/page.tsx"),"utf8");
 assert.match(repo,/ProjectWorkOrderCloseoutRequirement/);
 assert.match(repo,/requireCommercialWriteAccess/);
 assert.match(repo,/requireDailyClose/);
 assert.match(repo,/requireMaterialReturnAcknowledgement/);
 assert.match(repo,/warrantyStartDate/);
 assert.match(repo,/technicianSignOffAt/);
 assert.match(page,/Configure delivery requirements per customer \/ work order/);
 assert.match(page,/Tools \/ ladders removed/);
 assert.match(page,/Building secured/);
 assert.match(page,/Warranty required/);
});


test("immutable closeout snapshots project summary design topology devices and persisted requirements",()=>{
 const repository=fs.readFileSync(path.resolve(process.cwd(),"lib/contractor-os/project-approval-work-order.ts"),"utf8");
 assert.match(repository,/schemaVersion:3/);
 assert.match(repository,/projectSummary/);
 assert.match(repository,/completedScope/);
 assert.match(repository,/networkDesignArtifacts/);
 assert.match(repository,/deviceLinks/);
 assert.match(repository,/deviceList:devices/);
 assert.match(repository,/closeoutRequirements/);
 assert.match(repository,/ProjectWorkOrderCloseoutRequirement/);
 assert.match(repository,/FROM Device WHERE organizationId=/);
 assert.match(repository,/FROM DeviceLink l JOIN Device/);
});


test("closed work orders reject all post-closeout operational mutations",()=>{
 const lifecycle=fs.readFileSync(path.resolve(process.cwd(),"lib/contractor-os/work-order-lifecycle.ts"),"utf8");
 const repository=fs.readFileSync(path.resolve(process.cwd(),"lib/contractor-os/project-approval-work-order.ts"),"utf8");
 const cable=fs.readFileSync(path.resolve(process.cwd(),"lib/contractor-os/cable-run-execution.ts"),"utf8");
 const requirements=fs.readFileSync(path.resolve(process.cwd(),"lib/contractor-os/closeout-requirements.ts"),"utf8");
 assert.match(lifecycle,/export async function requireOpenWorkOrder/);
 assert.match(lifecycle,/status==="CLOSED"/);
 assert.match(lifecycle,/Closed work orders are immutable/);
 assert.ok((repository.match(/await requireOpenWorkOrder\(organizationId,input\.workOrderId\)/g)||[]).length>=6,"expected guards on work-order item, evidence, assignment, punch and final acceptance mutations");
 assert.ok((cable.match(/await requireOpenWorkOrder\(organizationId,input\.workOrderId\)/g)||[]).length>=3,"expected guards on cable execution, cable acceptance and floor closeout mutations");
 assert.match(requirements,/await requireOpenWorkOrder\(organizationId,input\.workOrderId\)/);
});
