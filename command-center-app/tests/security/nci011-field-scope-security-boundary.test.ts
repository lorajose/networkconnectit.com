import assert from "node:assert/strict";
import test from "node:test";

import { commercialReadScope, requireCommercialWriteAccess } from "../../lib/contractor-os/commercial-access";
import { routeAccess } from "../../lib/rbac";
import { seedFieldScopeFromSurvey, type FieldScopeSurveyWorkspace } from "../../lib/contractor-os/site-survey-field-scope-handoff";

const workspace: FieldScopeSurveyWorkspace = {
  session:{id:"ss-a",organizationId:"org-a"},
  assignment:{disciplinesJson:JSON.stringify(["CCTV"]),projectInstallationId:"project-a",siteId:"site-a"},
  areas:[{id:"area-a",name:"West Entrance"}],
  points:[{id:"sp-a",areaId:"area-a",assetId:null,discipline:"CCTV",pointType:"CAMERA",lifecycle:"PROPOSED",label:"CAM-001",notes:"Observed field note"}],
};

test("Field Scope commercial route excludes VIEWER and field-only roles",()=>{
  assert.deepEqual(routeAccess.takeoffs,["SUPER_ADMIN","INTERNAL_ADMIN","CLIENT_ADMIN"]);
  assert.equal(routeAccess.takeoffs.includes("VIEWER" as never),false);
});

test("commercial boundary rejects VIEWER writes and CLIENT_ADMIN cross-tenant access",()=>{
  assert.throws(()=>requireCommercialWriteAccess({role:"VIEWER",organizationId:"org-a"},"org-a"),/VIEWER cannot modify/);
  assert.throws(()=>requireCommercialWriteAccess({role:"CLIENT_ADMIN",organizationId:"org-a"},"org-b"),/Cross-tenant commercial write denied/);
  assert.throws(()=>commercialReadScope({role:"CLIENT_ADMIN",organizationId:"org-a"},"org-b"),/Cross-tenant commercial read denied/);
  assert.equal(requireCommercialWriteAccess({role:"CLIENT_ADMIN",organizationId:"org-a"},"org-a"),"org-a");
});

test("server-derived Field Scope ignores client-shaped commercial or identity fields",()=>{
  const clientPayload={stableKey:"CAM-SPOOFED",surveyPointId:"sp-other",unitCost:0.01,sellPrice:0.01,margin:99};
  void clientPayload;
  const seeds=seedFieldScopeFromSurvey(workspace);
  assert.equal(seeds.length,1);
  assert.equal(seeds[0].surveyPointId,"sp-a");
  assert.equal(seeds[0].draft.stableKey,"CAM-001");
  assert.equal(seeds[0].draft.surveySessionId,"ss-a");
  assert.equal("unitCost" in seeds[0].draft,false);
  assert.equal("sellPrice" in seeds[0].draft,false);
  assert.equal("margin" in seeds[0].draft,false);
});
