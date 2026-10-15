import assert from "node:assert/strict";
import test from "node:test";

import {
  formatPriceFromCents,
  parsePriceToCents
} from "../../lib/menuboard/money";

test("menu prices parse to integer cents without floating point storage", () => {
  assert.equal(parsePriceToCents("5"), 500);
  assert.equal(parsePriceToCents("5.9"), 590);
  assert.equal(parsePriceToCents("5.99"), 599);
  assert.equal(parsePriceToCents("$1,299.50"), 129950);
  assert.equal(parsePriceToCents("5.999"), null);
  assert.equal(parsePriceToCents("-1"), null);
  assert.equal(parsePriceToCents("free"), null);
});

test("menu prices render deterministically from integer cents", () => {
  assert.equal(formatPriceFromCents(599, "USD", "en-US"), "$5.99");
  assert.equal(formatPriceFromCents(129950, "USD", "en-US"), "$1,299.50");
});
