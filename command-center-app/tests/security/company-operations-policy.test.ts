import assert from "node:assert/strict";
import test from "node:test";
import { calendarDate, choice, nonNegativeDecimal, optionalEmail, requiredText, scopedOrganizationId, validateHours } from "../../lib/company-operations/policy";

test("operations rejects viewers and unknown roles, including same-tenant requests", () => {
  for (const role of ["VIEWER", "UNKNOWN"] as const) {
    assert.throws(() => scopedOrganizationId({ id: "u", role: role as "VIEWER", organizationId: "a" }, "a"), /administrator/);
  }
});

test("tenant admins cannot select other organizations and internal admins must select one", () => {
  const actor = { id: "u", role: "CLIENT_ADMIN" as const, organizationId: "a" };
  assert.equal(scopedOrganizationId(actor), "a");
  assert.throws(() => scopedOrganizationId(actor, "b"), /outside your tenant/);
  assert.throws(() => scopedOrganizationId({ ...actor, organizationId: null }), /not assigned/);
  assert.throws(() => scopedOrganizationId({ ...actor, role: "INTERNAL_ADMIN" }), /Organization/);
  assert.equal(scopedOrganizationId({ ...actor, role: "SUPER_ADMIN" }, "b"), "b");
  assert.throws(() => scopedOrganizationId({ ...actor, id: "" }), /administrator/);
});

test("calendar dates reject rollover and invalid formats", () => {
  assert.equal(calendarDate("2024-02-29", "date").toISOString(), "2024-02-29T00:00:00.000Z");
  for (const value of ["2026-02-29", "2026-04-31", "2026-13-01", "", "2026-1-1", "0000-01-01"]) {
    assert.throws(() => calendarDate(value, "date"), /Invalid/);
  }
});

test("amounts preserve zero and reject nonfinite, negative, excessive and fractional-cent values", () => {
  assert.equal(nonNegativeDecimal(0, "amount", 100), 0);
  assert.equal(nonNegativeDecimal(19.99, "amount", 100), 19.99);
  for (const value of [NaN, Infinity, -1, 101, 1.001]) assert.throws(() => nonNegativeDecimal(value, "amount", 100));
});

test("time entries require positive total hours within one day", () => {
  validateHours(8, 2);
  validateHours(24, 0);
  for (const [regular, overtime] of [[0, 0], [24, 1], [-1, 8], [8, NaN], [8.001, 0]]) {
    assert.throws(() => validateHours(regular, overtime));
  }
});

test("text, enum and email validation reject malformed persisted values", () => {
  assert.equal(requiredText("  Jose  ", "name", 10), "Jose");
  assert.throws(() => requiredText(" ", "name", 10));
  assert.throws(() => requiredText("too long", "name", 2));
  assert.throws(() => choice("MANAGER", ["W2", "1099"], "worker type"));
  assert.equal(optionalEmail(""), null);
  assert.equal(optionalEmail(" a@example.com "), "a@example.com");
  assert.throws(() => optionalEmail("bad@email"));
});
