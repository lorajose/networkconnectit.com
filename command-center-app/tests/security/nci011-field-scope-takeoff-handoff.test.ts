import assert from "node:assert/strict";
import test from "node:test";

import { approveFieldScopeForTakeoff } from "../../lib/contractor-os/field-scope-takeoff-handoff";
import { reviewFieldScopeDraft, type FieldScopeDraft } from "../../lib/contractor-os/field-scope";

const draft: FieldScopeDraft = {
  schemaVersion:"1", projectId:"p1", siteId:"s1", surveySessionId:"ss1", surveyPointId:"sp1", stableKey:"CAM-001",
  system:"SURVEILLANCE", discipline:"CCTV",
  deviceType:{value:"CAMERA",confidence:"HIGH"}, location:{value:"West Entrance",confidence:"HIGH"},
  environment:{value:null,confidence:"LOW"}, quantity:{value:1,confidence:"HIGH"}, mountingHeightFt:{value:null,confidence:"LOW"},
  mountingSurface:{value:null,confidence:"LOW"}, cableType:{value:null,confidence:"LOW"}, estimatedCableLengthFt:{value:null,confidence:"LOW"},
  pathway:{value:null,confidence:"LOW"}, destination:{value:null,confidence:"LOW"}, accessEquipment:{value:null,confidence:"LOW"},
  requestedAccessories:[], suggestedAccessories:[], laborDrivers:[], assumptions:[], exclusions:[], missingInformation:["destination"]
};

const reviewed = reviewFieldScopeDraft(draft,{destination:"IDF-2",cableType:"CAT6",estimatedCableLengthFt:140,suggestedAccessories:["Weatherproof junction box"]},{userId:"estimator-1",reviewedAt:"2026-10-03T20:00:00.000Z"});

test("approved handoff has stable survey marker and no commercial arithmetic",()=>{
  const first=approveFieldScopeForTakeoff({surveySessionId:"ss1",reviewedScopes:[reviewed],approvedStableKeys:["CAM-001"],approvedBy:"estimator-1",approvedAt:"2026-10-03T20:05:00.000Z"});
  const second=approveFieldScopeForTakeoff({surveySessionId:"ss1",reviewedScopes:[reviewed],approvedStableKeys:["CAM-001"],approvedBy:"estimator-1",approvedAt:"2026-10-03T20:06:00.000Z"});
  assert.equal(first.handoffId,"FIELD-SCOPE:ss1");
  assert.equal(second.handoffId,first.handoffId);
  assert.equal(first.items.length,3);
  for(const item of first.items){
    assert.match(item.notes ?? "",/^Field Scope handoff FIELD-SCOPE:ss1;/);
    assert.equal("unitCost" in item,false);
    assert.equal("sellPrice" in item,false);
    assert.equal("margin" in item,false);
  }
});

test("handoff rejects cross-session and unknown approvals",()=>{
  assert.throws(()=>approveFieldScopeForTakeoff({surveySessionId:"other",reviewedScopes:[reviewed],approvedStableKeys:["CAM-001"],approvedBy:"estimator-1",approvedAt:"2026-10-03T20:05:00.000Z"}),/different survey session/);
  assert.throws(()=>approveFieldScopeForTakeoff({surveySessionId:"ss1",reviewedScopes:[reviewed],approvedStableKeys:["UNKNOWN"],approvedBy:"estimator-1",approvedAt:"2026-10-03T20:05:00.000Z"}),/unknown Field Scope keys/);
});
