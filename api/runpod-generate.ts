import {
  type ApiRequest,
  type ApiResponse,
  readJsonBody,
  readJsonResponse,
  requireEnv,
  sendJson,
} from "./_utils";

interface RunpodGenerateRequest {
  workflow: Record<string, unknown>;
  images?: Array<{
    name: string;
    image: string;
  }>;
}

export default async function handler(
  request: ApiRequest,
  apiResponse: ApiResponse,
): Promise<void> {
  if (request.method !== "POST") {
    sendJson(apiResponse, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const { workflow, images } =
      await readJsonBody<RunpodGenerateRequest>(request);

    if (!workflow || typeof workflow !== "object") {
      sendJson(apiResponse, 400, { error: "Workflow is required" });
      return;
    }

    const endpointId = requireEnv("RUNPOD_ENDPOINT_ID");
    const runpodResponse = await fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
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

    const data = await readJsonResponse<unknown>(runpodResponse);
    if (!runpodResponse.ok) {
      sendJson(apiResponse, runpodResponse.status, {
        error: `RunPod error: ${runpodResponse.status}`,
        details: data,
      });
      return;
    }

    sendJson(apiResponse, 200, data);
  } catch (error) {
    sendJson(apiResponse, 500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
