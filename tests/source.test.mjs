import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the complete quality workflow", async () => {
  const dashboard = await readFile(new URL("../app/QualityDashboard.tsx", import.meta.url), "utf8");
  assert.match(dashboard, /Quality command center/);
  assert.match(dashboard, /Active non-conformances/);
  assert.match(dashboard, /8D Investigation Copilot/);
  assert.match(dashboard, /Create non-conformance/);
  assert.match(dashboard, /ProductWalkthrough/);
});

test("protects the app with Clerk and persists onboarding", async () => {
  const [layout, proxy, onboarding, walkthrough] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../proxy.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/onboarding/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/ProductWalkthrough.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /ClerkProvider/);
  assert.match(proxy, /auth\.protect/);
  assert.match(onboarding, /updateUserMetadata/);
  assert.match(walkthrough, /Skip tour/);
  assert.match(walkthrough, /qualityCopilotOnboarded/);
});

test("documents required runtime configuration", async () => {
  const environment = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  assert.match(environment, /NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/);
  assert.match(environment, /CLERK_SECRET_KEY/);
  assert.match(environment, /MONGODB_URL/);
  assert.doesNotMatch(environment, /pk_(?:live|test)_[A-Za-z0-9]{20,}/);
  assert.doesNotMatch(environment, /sk_(?:live|test)_[A-Za-z0-9]{20,}/);
});
