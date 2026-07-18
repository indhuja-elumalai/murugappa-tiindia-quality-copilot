import { clerkMiddleware, getAuth } from "@clerk/express";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose, { Schema } from "mongoose";
import { z } from "zod";

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URL: z.string().min(12),
  CORS_ORIGIN: z.string().min(4),
  CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  CLERK_SECRET_KEY: z.string().startsWith("sk_"),
  AI_SERVICE_URL: z.string().url(),
  AI_INTERNAL_API_KEY: z.string().min(24),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const environment = environmentSchema.parse(process.env);
const allowedOrigins = environment.CORS_ORIGIN.split(",").map((origin) => origin.trim());

mongoose.set("sanitizeFilter", true);

const incidentSchema = new Schema({
  ncrNumber: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  division: { type: String, required: true, index: true, trim: true },
  supplier: { type: String, required: true, index: true, trim: true },
  component: { type: String, required: true, trim: true },
  severity: { type: String, enum: ["High", "Medium", "Low"], required: true },
  status: { type: String, enum: ["Open", "In progress", "Review", "Closed"], default: "Open", index: true },
  createdByClerkUserId: { type: String, required: true, index: true },
}, { timestamps: true, versionKey: false });
incidentSchema.index({ createdByClerkUserId: 1, ncrNumber: 1 }, { unique: true });

const Incident = mongoose.model("Incident", incidentSchema);
const incidentInput = z.object({
  ncrNumber: z.string().trim().min(3).max(40),
  title: z.string().trim().min(8).max(240),
  division: z.string().trim().min(2).max(100),
  supplier: z.string().trim().min(2).max(160),
  component: z.string().trim().min(2).max(160),
  severity: z.enum(["High", "Medium", "Low"]),
});
const investigationInput = z.object({
  incidentId: z.string().trim().min(3).max(40),
  problem: z.string().trim().min(12).max(2000),
  division: z.string().trim().min(2).max(100),
});

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true, methods: ["GET", "POST", "PATCH", "OPTIONS"] }));
app.use(express.json({ limit: "100kb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));
app.use(clerkMiddleware({ authorizedParties: allowedOrigins }));

function authenticatedUser(request: Request, response: Response): string | null {
  const authentication = getAuth(request);
  if (!authentication.isAuthenticated || !authentication.userId) {
    response.status(401).json({ error: "unauthorized" });
    return null;
  }
  return authentication.userId;
}

app.get("/health", (_request, response) => {
  const connected = mongoose.connection.readyState === 1;
  response.status(connected ? 200 : 503).json({ status: connected ? "healthy" : "degraded", database: connected ? "connected" : "unavailable" });
});

app.get("/api/v1/incidents", async (request, response, next) => {
  try {
    const userId = authenticatedUser(request, response);
    if (!userId) return;
    const incidents = await Incident.find({ createdByClerkUserId: userId }).sort({ createdAt: -1 }).limit(100).lean();
    response.json({ data: incidents });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/incidents", async (request, response, next) => {
  try {
    const userId = authenticatedUser(request, response);
    if (!userId) return;
    const parsed = incidentInput.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "invalid_incident", details: parsed.error.issues });
      return;
    }
    const incident = await Incident.create({ ...parsed.data, createdByClerkUserId: userId });
    response.status(201).json({ data: incident });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/investigations", async (request, response, next) => {
  try {
    const userId = authenticatedUser(request, response);
    if (!userId) return;
    const parsed = investigationInput.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "invalid_investigation", details: parsed.error.issues });
      return;
    }
    const upstream = await fetch(`${environment.AI_SERVICE_URL}/api/v1/investigations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-API-Key": environment.AI_INTERNAL_API_KEY },
      body: JSON.stringify({ incident_id: parsed.data.incidentId, problem: parsed.data.problem, division: parsed.data.division }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await upstream.text();
    response.status(upstream.status).type(upstream.headers.get("content-type") ?? "application/json").send(body);
  } catch (error) {
    next(error);
  }
});

app.use((_request, response) => response.status(404).json({ error: "not_found" }));
app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  void _next;
  const duplicateKey = typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  if (duplicateKey) {
    response.status(409).json({ error: "duplicate_ncr_number" });
    return;
  }
  console.error("Unhandled API error", error);
  response.status(500).json({ error: "internal_server_error" });
});

async function start() {
  await mongoose.connect(environment.MONGODB_URL, { serverSelectionTimeoutMS: 10_000 });
  const server = app.listen(environment.PORT, "0.0.0.0", () => console.log(`Quality API listening on ${environment.PORT}`));
  const shutdown = async () => {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((error) => {
  console.error("Quality API failed to start", error);
  process.exit(1);
});
