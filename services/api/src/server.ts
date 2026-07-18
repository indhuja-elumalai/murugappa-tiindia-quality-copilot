import cors from "cors";
import express from "express";
import mongoose, { Schema } from "mongoose";
import { z } from "zod";

const app = express();
app.use(cors());
app.use(express.json({ limit: "250kb" }));

const incidentSchema = new Schema({
  ncrNumber: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  division: { type: String, required: true, index: true },
  supplier: { type: String, required: true, index: true },
  component: { type: String, required: true },
  severity: { type: String, enum: ["High", "Medium", "Low"], required: true },
  status: { type: String, enum: ["Open", "In progress", "Review", "Closed"], default: "Open", index: true },
}, { timestamps: true });

const Incident = mongoose.model("Incident", incidentSchema);
const incidentInput = z.object({
  ncrNumber: z.string().min(3).max(40),
  title: z.string().min(8).max(240),
  division: z.string().min(2).max(100),
  supplier: z.string().min(2).max(160),
  component: z.string().min(2).max(160),
  severity: z.enum(["High", "Medium", "Low"]),
});

app.get("/health", (_request, response) => response.json({ status: "healthy" }));
app.get("/api/v1/incidents", async (_request, response) => {
  const incidents = await Incident.find().sort({ createdAt: -1 }).lean();
  response.json({ data: incidents });
});
app.post("/api/v1/incidents", async (request, response) => {
  const parsed = incidentInput.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "invalid_incident", details: parsed.error.issues });
  const incident = await Incident.create(parsed.data);
  return response.status(201).json({ data: incident });
});

const port = Number(process.env.PORT ?? 4000);
const mongoUrl = process.env.MONGODB_URL ?? "mongodb://localhost:27017/quality_copilot";
mongoose.connect(mongoUrl).then(() => app.listen(port, () => console.log(`Quality API listening on ${port}`)));
