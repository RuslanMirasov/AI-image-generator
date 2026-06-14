import {
  type ApiRequest,
  type ApiResponse,
  readJsonBody,
  readJsonResponse,
  requireEnv,
  sendJson,
} from "./_utils";

interface ImprovePromptRequest {
  userPrompt: string;
  systemPrompt: string;
  model?: string;
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
    const { userPrompt, systemPrompt, model } =
      await readJsonBody<ImprovePromptRequest>(request);

    if (!userPrompt?.trim() || !systemPrompt?.trim()) {
      sendJson(apiResponse, 400, { error: "Prompt is required" });
      return;
    }

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1000,
      }),
    });

    if (!openAiResponse.ok) {
      const error = await openAiResponse.text();
      sendJson(apiResponse, openAiResponse.status, {
        error: `OpenAI error: ${openAiResponse.status}`,
        details: error,
      });
      return;
    }

    const data = await readJsonResponse<{
      choices?: Array<{ message?: { content?: string } }>;
    }>(openAiResponse);
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      sendJson(apiResponse, 502, { error: "OpenAI returned an empty response" });
      return;
    }

    sendJson(apiResponse, 200, { content });
  } catch (error) {
    sendJson(apiResponse, 500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
