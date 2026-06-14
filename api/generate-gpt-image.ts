import {
  jsonResponse,
  parseDataUrl,
  readJsonBody,
  readJsonResponse,
  requireEnv,
} from "./_utils";

interface GenerateGptImageRequest {
  referenceBase64: string;
  prompt: string;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { referenceBase64, prompt } =
      await readJsonBody<GenerateGptImageRequest>(request);

    if (!referenceBase64 || !prompt?.trim()) {
      return jsonResponse(
        { error: "Reference image and prompt are required" },
        { status: 400 },
      );
    }

    const { mimeType, base64 } = parseDataUrl(referenceBase64);
    const imageBlob = new Blob([base64ToBytes(base64)], { type: mimeType });

    const formData = new FormData();
    formData.append("image", imageBlob, "reference.png");
    formData.append("prompt", prompt);
    formData.append("model", "gpt-image-1");
    formData.append("size", "1024x1536");
    formData.append("n", "1");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("OPENAI_API_KEY")}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      return jsonResponse(
        { error: `OpenAI image error: ${response.status}`, details: error },
        { status: response.status },
      );
    }

    const data = await readJsonResponse<{
      data?: Array<{ url?: string; b64_json?: string }>;
    }>(response);
    const image = data?.data?.[0];
    const imageUrl = image?.url || (image?.b64_json ? `data:image/png;base64,${image.b64_json}` : null);

    if (!imageUrl) {
      return jsonResponse({ error: "OpenAI returned no image" }, { status: 502 });
    }

    return jsonResponse({ imageUrl });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
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
