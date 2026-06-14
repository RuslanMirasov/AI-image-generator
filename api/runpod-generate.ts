import {
  jsonResponse,
  readJsonBody,
  readJsonResponse,
  requireEnv,
} from "./_utils";

interface RunpodGenerateRequest {
  workflow: Record<string, unknown>;
  images?: Array<{
    name: string;
    image: string;
  }>;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { workflow, images } =
      await readJsonBody<RunpodGenerateRequest>(request);

    if (!workflow || typeof workflow !== "object") {
      return jsonResponse({ error: "Workflow is required" }, { status: 400 });
    }

    const endpointId = requireEnv("RUNPOD_ENDPOINT_ID");
    const response = await fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${requireEnv("RUNPOD_API_KEY")}`,
      },
      body: JSON.stringify({
        input: {
          workflow,
          ...(images?.length ? { images } : {}),
        },
      }),
    });

    const data = await readJsonResponse<unknown>(response);
    if (!response.ok) {
      return jsonResponse(
        { error: `RunPod error: ${response.status}`, details: data },
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
