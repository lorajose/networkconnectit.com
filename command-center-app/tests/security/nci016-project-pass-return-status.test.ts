import assert from "node:assert/strict";
import test from "node:test";

import { getProjectPassReturnState } from "../../lib/contractor-os/project-pass-return-status";

test("success return is UX-only and requires a server entitlement check", () => {
  const state = getProjectPassReturnState("success");

  assert.equal(state.status, "success");
  assert.equal(state.checkoutCompleted, true);
  assert.equal(state.shouldCheckServerEntitlement, true);
  assert.equal("authorized" in state, false);
  assert.equal("entitlement" in state, false);
});

test("cancelled return never requests premium unlock", () => {
  const state = getProjectPassReturnState("cancelled");

  assert.equal(state.status, "cancelled");
  assert.equal(state.checkoutCompleted, false);
  assert.equal(state.shouldCheckServerEntitlement, false);
});

test("failed return never requests premium unlock", () => {
  const state = getProjectPassReturnState("failed");

  assert.equal(state.status, "failed");
  assert.equal(state.checkoutCompleted, false);
  assert.equal(state.shouldCheckServerEntitlement, false);
});

test("unknown, empty and attacker-controlled return values fail closed as cancelled UX", () => {
  for (const value of [undefined, null, "", "paid", "authorized", "premium", "SUCCESS<script>"]) {
    const state = getProjectPassReturnState(value);
    assert.equal(state.status, "cancelled");
    assert.equal(state.checkoutCompleted, false);
    assert.equal(state.shouldCheckServerEntitlement, false);
  }
});

test("return parsing is normalized but does not create payment authority", () => {
  const state = getProjectPassReturnState("  SUCCESS  ");

  assert.equal(state.status, "success");
  assert.equal(state.shouldCheckServerEntitlement, true);
  assert.match(state.message, /verifying project pass access with the server/i);
});
