import {
  type ApiRequest,
  type ApiResponse,
  readJsonResponse,
  requireEnv,
  sendJson,
} from "./_utils";

export default async function handler(
  request: ApiRequest,
  apiResponse: ApiResponse,
): Promise<void> {
  if (request.method !== "GET") {
    sendJson(apiResponse, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const rawJobId = request.query?.id;
    const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;

    if (!jobId) {
      sendJson(apiResponse, 400, { error: "Job id is required" });
      return;
    }

    const endpointId = requireEnv("RUNPOD_ENDPOINT_ID");
    const runpodResponse = await fetch(
      `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${requireEnv("RUNPOD_API_KEY")}`,
        },
      },
    );

    const data = await readJsonResponse<unknown>(runpodResponse);
    if (!runpodResponse.ok) {
      sendJson(apiResponse, runpodResponse.status, {
        error: `RunPod status error: ${runpodResponse.status}`,
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
