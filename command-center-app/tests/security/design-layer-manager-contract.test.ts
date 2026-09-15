import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function source(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("layer manager exposes accessible visibility, lock and ordering controls", () => {
  const manager = source("components/design-studio/design-layer-manager.tsx");
  assert.match(manager, /aria-label=.*Hide/);
  assert.match(manager, /aria-label=.*Unlock/);
  assert.match(manager, /Move \$\{layer\.name\} up/);
  assert.match(manager, /Move \$\{layer\.name\} down/);
  assert.match(manager, /orderedLayers/);
});

test("layer assignment identifies locked and hidden destinations", () => {
  const assignment = source("components/design-studio/design-layer-assignment.tsx");
  assert.match(assignment, /layer\.locked/);
  assert.match(assignment, /layer\.visible/);
  assert.match(assignment, /Current layer is locked/);
});
