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
  for (const destination of ["Non-conformance", "8D investigations", "Supplier quality", "Knowledge base", "Quality reports", "Settings"]) {
    assert.match(dashboard, new RegExp(destination));
  }
  assert.match(dashboard, /How was this generated/);
  assert.match(dashboard, /Open saved investigation/);
});

test("persists auditable evidence-backed investigations", async () => {
  const [qualityApi, aiService] = await Promise.all([
    readFile(new URL("../services/api/src/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../services/ai/app/main.py", import.meta.url), "utf8"),
  ]);
  assert.match(qualityApi, /Investigation\.create/);
  assert.match(qualityApi, /createdByClerkUserId/);
  assert.match(qualityApi, /generationMethod/);
  assert.match(aiService, /Qdrant vector retrieval/);
  assert.match(aiService, /excerpt=item\["text"\]/);
});

test("implements every interactive operational workflow", async () => {
  const [dashboard, qualityApi, incidentPatch, investigationPatch, knowledgeRoute, healthRoute] = await Promise.all([
    readFile(new URL("../app/QualityDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../services/api/src/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/incidents/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/investigations/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/knowledge/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/system/health/route.ts", import.meta.url), "utf8"),
  ]);
  for (const control of ["Update status", "Save review progress", "Export CSV", "Print report", "Test all connections", "Quality notifications", "Done reviewing"]) {
    assert.match(dashboard, new RegExp(control));
  }
  assert.match(qualityApi, /app\.patch\("\/api\/v1\/incidents/);
  assert.match(qualityApi, /app\.patch\("\/api\/v1\/investigations/);
  assert.match(incidentPatch, /method: "PATCH"/);
  assert.match(investigationPatch, /method: "PATCH"/);
  assert.match(knowledgeRoute, /\/api\/v1\/knowledge/);
  assert.match(healthRoute, /\/api\/v1\/system\/health/);
});

test("protects the app with Clerk and persists onboarding", async () => {
  const [layout, page, proxy, onboarding, walkthrough] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../proxy.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/onboarding/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/ProductWalkthrough.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /ClerkProvider/);
  assert.match(proxy, /clerkMiddleware/);
  assert.match(page, /auth\.protect/);
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
