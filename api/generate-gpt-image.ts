import {
  type ApiRequest,
  type ApiResponse,
  parseDataUrl,
  readJsonBody,
  readJsonResponse,
  requireEnv,
  sendJson,
} from "./_utils";

interface GenerateGptImageRequest {
  referenceBase64: string;
  prompt: string;
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
    const { referenceBase64, prompt } =
      await readJsonBody<GenerateGptImageRequest>(request);

    if (!referenceBase64 || !prompt?.trim()) {
      sendJson(apiResponse, 400, { error: "Reference image and prompt are required" });
      return;
    }

    const { mimeType, base64 } = parseDataUrl(referenceBase64);
    const imageBlob = new Blob([base64ToBytes(base64)], { type: mimeType });

    const formData = new FormData();
    formData.append("image", imageBlob, "reference.png");
    formData.append("prompt", prompt);
    formData.append("model", "gpt-image-1");
    formData.append("size", "1024x1536");
    formData.append("n", "1");

    const openAiResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("OPENAI_API_KEY")}`,
      },
      body: formData,
    });

    if (!openAiResponse.ok) {
      const error = await openAiResponse.text();
      sendJson(apiResponse, openAiResponse.status, {
        error: `OpenAI image error: ${openAiResponse.status}`,
        details: error,
      });
      return;
    }

    const data = await readJsonResponse<{
      data?: Array<{ url?: string; b64_json?: string }>;
    }>(openAiResponse);
    const image = data?.data?.[0];
    const imageUrl = image?.url || (image?.b64_json ? `data:image/png;base64,${image.b64_json}` : null);

    if (!imageUrl) {
      sendJson(apiResponse, 502, { error: "OpenAI returned no image" });
      return;
    }

    sendJson(apiResponse, 200, { imageUrl });
  } catch (error) {
    sendJson(apiResponse, 500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
