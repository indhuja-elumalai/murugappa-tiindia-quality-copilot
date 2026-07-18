import type { Metadata } from "next";
import { QualityDashboard } from "./QualityDashboard";

export const metadata: Metadata = {
  title: "Quality Command Center",
  description:
    "AI-assisted supplier quality, non-conformance, and 8D investigation workspace.",
};

export default function Home() {
  return <QualityDashboard />;
}
