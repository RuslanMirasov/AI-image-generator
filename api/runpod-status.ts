import { jsonResponse, readJsonResponse, requireEnv } from "./_utils";

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("id");

    if (!jobId) {
      return jsonResponse({ error: "Job id is required" }, { status: 400 });
    }

    const endpointId = requireEnv("RUNPOD_ENDPOINT_ID");
    const response = await fetch(
      `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${requireEnv("RUNPOD_API_KEY")}`,
        },
      },
    );

    const data = await readJsonResponse<unknown>(response);
    if (!response.ok) {
      return jsonResponse(
        { error: `RunPod status error: ${response.status}`, details: data },
        { status: response.status },
      );
    }

    return jsonResponse(data);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
