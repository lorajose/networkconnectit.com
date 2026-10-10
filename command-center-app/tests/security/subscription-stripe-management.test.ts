import test from "node:test";
import assert from "node:assert/strict";

import { StripeSubscriptionManagement } from "../../lib/contractor-os/subscription-stripe-management";
import type { SubscriptionStripeConfig } from "../../lib/contractor-os/subscription-stripe-config";

const config: SubscriptionStripeConfig = {
  secretKey: "sk_test_management",
  webhookSecret: "whsec_test_management",
  priceIds: { PRO: "price_Pro123", BUSINESS: "price_Business456" },
};

function subscriptionResponse(priceId: string) {
  return { id: "sub_123", items: { data: [{ id: "si_123", price: { id: priceId } }] } };
}

test("upgrade uses persisted subscription identity and server-owned Business price", async () => {
  const calls: Array<{ url: string; body: string }> = [];
  const manager = new StripeSubscriptionManagement(config, async (input, init) => {
    calls.push({ url: String(input), body: String(init?.body ?? "") });
    if (init?.method === "GET") return new Response(JSON.stringify(subscriptionResponse("price_Pro123")), { status: 200 });
    return new Response("{}", { status: 200 });
  });
  await manager.upgrade({ providerSubscriptionId: "sub_123", organizationId: "org-1", toPlan: "BUSINESS" });
  assert.equal(calls.length, 2);
  const params = new URLSearchParams(calls[1].body);
  assert.equal(params.get("items[0][id]"), "si_123");
  assert.equal(params.get("items[0][price]"), "price_Business456");
  assert.equal(params.get("metadata[organizationId]"), "org-1");
  assert.equal(params.get("metadata[plan]"), "BUSINESS");
  assert.equal(params.get("proration_behavior"), "always_invoice");
  assert.equal(params.get("payment_behavior"), "error_if_incomplete");
});

test("cancellation is scheduled at period end", async () => {
  const bodies: string[] = [];
  const manager = new StripeSubscriptionManagement(config, async (_input, init) => {
    bodies.push(String(init?.body ?? ""));
    if (init?.method === "GET") return new Response(JSON.stringify(subscriptionResponse("price_Pro123")), { status: 200 });
    return new Response("{}", { status: 200 });
  });
  await manager.cancelAtPeriodEnd("sub_123");
  assert.equal(new URLSearchParams(bodies[1]).get("cancel_at_period_end"), "true");
});

test("downgrade preserves Business through the current phase and returns persisted schedule identity", async () => {
  const requests: Array<{ url: string; method: string; body: string }> = [];
  const manager = new StripeSubscriptionManagement(config, async (input, init) => {
    const url = String(input); const method = init?.method ?? "GET";
    requests.push({ url, method, body: String(init?.body ?? "") });
    if (url.endsWith("/subscriptions/sub_123") && method === "GET") return new Response(JSON.stringify(subscriptionResponse("price_Business456")), { status: 200 });
    if (url.endsWith("/subscription_schedules") && method === "POST") return new Response(JSON.stringify({ id: "sub_sched_123", phases: [{ start_date: 1790812800, end_date: 1793491200 }] }), { status: 200 });
    if (url.endsWith("/prices/price_Pro123")) return new Response(JSON.stringify({ id: "price_Pro123", recurring: { interval: "month", interval_count: 1 } }), { status: 200 });
    return new Response("{}", { status: 200 });
  });
  const result = await manager.downgradeAtPeriodEnd({ providerSubscriptionId: "sub_123", organizationId: "org-1", toPlan: "PRO" });
  assert.equal(result.providerScheduleId, "sub_sched_123");
  assert.equal(result.effectiveAt.toISOString(), new Date(1793491200 * 1000).toISOString());
  assert.equal(new URLSearchParams(requests[1].body).get("from_subscription"), "sub_123");
  const updateSchedule = new URLSearchParams(requests[3].body);
  assert.equal(updateSchedule.get("phases[0][items][0][price]"), "price_Business456");
  assert.equal(updateSchedule.get("phases[1][items][0][price]"), "price_Pro123");
  assert.equal(updateSchedule.get("phases[1][metadata][plan]"), "PRO");
  assert.equal(updateSchedule.get("end_behavior"), "release");
});

test("scheduled downgrade release verifies provider schedule and active subscription identity", async () => {
  const calls: Array<{ url: string; method: string }> = [];
  const manager = new StripeSubscriptionManagement(config, async (input, init) => {
    calls.push({ url: String(input), method: init?.method ?? "GET" });
    return new Response(JSON.stringify({ id: "sub_sched_123", status: "released", released_subscription: "sub_123" }), { status: 200 });
  });
  await manager.releaseScheduledChange({ providerScheduleId: "sub_sched_123", providerSubscriptionId: "sub_123" });
  assert.deepEqual(calls, [{ url: "https://api.stripe.com/v1/subscription_schedules/sub_sched_123/release", method: "POST" }]);
});

test("scheduled downgrade release rejects a different released subscription", async () => {
  const manager = new StripeSubscriptionManagement(config, async () => new Response(JSON.stringify({ id: "sub_sched_123", status: "released", released_subscription: "sub_attacker" }), { status: 200 }));
  await assert.rejects(() => manager.releaseScheduledChange({ providerScheduleId: "sub_sched_123", providerSubscriptionId: "sub_123" }), /unexpected subscription/);
});

test("scheduled downgrade release rejects an unexpected schedule identity", async () => {
  const manager = new StripeSubscriptionManagement(config, async () => new Response(JSON.stringify({ id: "sub_sched_other", status: "released", released_subscription: "sub_123" }), { status: 200 }));
  await assert.rejects(() => manager.releaseScheduledChange({ providerScheduleId: "sub_sched_123", providerSubscriptionId: "sub_123" }), /unexpected schedule/);
});

test("untrusted current Stripe price blocks subscription mutation", async () => {
  const manager = new StripeSubscriptionManagement(config, async () => new Response(JSON.stringify(subscriptionResponse("price_Attacker")), { status: 200 }));
  await assert.rejects(() => manager.upgrade({ providerSubscriptionId: "sub_123", organizationId: "org-1", toPlan: "BUSINESS" }), /untrusted price id/);
});
