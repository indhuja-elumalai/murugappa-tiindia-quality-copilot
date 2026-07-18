import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      qualityCopilotOnboarded: true,
      qualityCopilotOnboardedAt: new Date().toISOString(),
    },
  });

  return Response.json({ completed: true });
}
