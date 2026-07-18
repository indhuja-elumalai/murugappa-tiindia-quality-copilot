import { qualityApiRequest } from "../../_lib/qualityApi";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return qualityApiRequest(`/api/v1/investigations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: await request.text(),
  });
}

