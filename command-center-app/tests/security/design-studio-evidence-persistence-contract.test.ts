import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repositoryPath = path.resolve(process.cwd(), "lib/contractor-os/design-studio-repository.ts");
const source = fs.readFileSync(repositoryPath, "utf8");

test("NCI-065 Design Studio persistence retains layer and report evidence metadata", () => {
  assert.match(source, /SELECT id,designLayerId,kind,geometryJson,metadataJson FROM DesignElement/);
  assert.match(source, /layerId:row\.designLayerId/);
  assert.match(source, /discipline:metadata\.discipline/);
  assert.match(source, /cameraFov:metadata\.cameraFov/);
  assert.match(source, /cameraDori:metadata\.cameraDori/);
  assert.match(source, /cableRoute:metadata\.cableRoute/);
  assert.match(source, /networkAddressing:metadata\.networkAddressing/);
});

test("NCI-065 save path validates requested layers and persists evidence fields", () => {
  assert.match(source, /availableLayerIds\.has\(element\.layerId\)/);
  assert.match(source, /discipline:element\.discipline/);
  assert.match(source, /cameraFov:element\.cameraFov/);
  assert.match(source, /cameraDori:element\.cameraDori/);
  assert.match(source, /cableRoute:element\.cableRoute/);
  assert.match(source, /topologyConnection:element\.topologyConnection/);
});
