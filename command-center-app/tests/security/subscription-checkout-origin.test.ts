import test from "node:test";
import assert from "node:assert/strict";

import { subscriptionApplicationRoot } from "../../lib/contractor-os/subscription-checkout-origin";

test("subscription checkout root strips the NextAuth endpoint and preserves the app base path", () => {
  assert.equal(
    subscriptionApplicationRoot({
      NEXTAUTH_URL: "https://networkconnectit.com/tools/command-center/api/auth",
      NEXT_PUBLIC_APP_URL: "https://ignored.example.test/",
      NODE_ENV: "production",
    }),
    "https://networkconnectit.com/tools/command-center"
  );
});

test("QA-style NextAuth URL derives the application root instead of /api/auth/billing", () => {
  assert.equal(
    subscriptionApplicationRoot({
      NEXTAUTH_URL: "https://qa-command.networkconnectit.net/api/auth",
      NODE_ENV: "production",
    }),
    "https://qa-command.networkconnectit.net"
  );
});

test("subscription checkout falls back to configured public app URL", () => {
  assert.equal(
    subscriptionApplicationRoot({
      NEXTAUTH_URL: "not a valid URL",
      NEXT_PUBLIC_APP_URL: "https://app.example.test/contractor-os/",
      NODE_ENV: "production",
    }),
    "https://app.example.test/contractor-os"
  );
});

test("production checkout fails closed when no trusted application URL is configured", () => {
  assert.throws(() => subscriptionApplicationRoot({ NODE_ENV: "production" }), /return URL is not configured/);
});

test("development fallback uses localhost and the configured app base path", () => {
  assert.equal(
    subscriptionApplicationRoot({ NODE_ENV: "development", NEXT_PUBLIC_APP_BASE_PATH: "/tools/command-center/" }),
    "http://localhost:3000/tools/command-center"
  );
});

test("unsupported URL protocols are never accepted as checkout roots", () => {
  assert.throws(
    () => subscriptionApplicationRoot({ NEXTAUTH_URL: "javascript:alert(1)", NEXT_PUBLIC_APP_URL: "ftp://example.test/app", NODE_ENV: "production" }),
    /return URL is not configured/
  );
});
