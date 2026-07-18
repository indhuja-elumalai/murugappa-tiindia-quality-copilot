import { qualityApiRequest } from "../_lib/qualityApi";

export async function GET() {
  return qualityApiRequest("/api/v1/knowledge");
}

