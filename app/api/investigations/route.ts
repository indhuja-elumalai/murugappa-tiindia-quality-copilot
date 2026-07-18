import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  const apiUrl = process.env.QUALITY_API_URL;
  if (!apiUrl || !process.env.CLERK_SECRET_KEY) {
    return Response.json({ error: "quality_api_not_configured" }, { status: 503 });
  }
  const { userId, getToken } = await auth();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const token = await getToken();
  if (!token) return Response.json({ error: "session_token_unavailable" }, { status: 401 });
  const upstream = await fetch(`${apiUrl}/api/v1/investigations`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: await request.text(),
  });
  const body = await upstream.text();
  return new Response(body, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" } });
}
