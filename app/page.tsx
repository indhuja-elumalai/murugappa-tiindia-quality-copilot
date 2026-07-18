import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { QualityDashboard } from "./QualityDashboard";

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

export const metadata: Metadata = {
  title: "Quality Command Center",
  description:
    "AI-assisted supplier quality, non-conformance, and 8D investigation workspace.",
};

export default async function Home() {
  if (clerkConfigured) await auth.protect();
  return <QualityDashboard />;
}
