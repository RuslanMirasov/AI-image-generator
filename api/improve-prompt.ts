import {
  jsonResponse,
  readJsonBody,
  readJsonResponse,
  requireEnv,
} from "./_utils";

interface ImprovePromptRequest {
  userPrompt: string;
  systemPrompt: string;
  model?: string;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { userPrompt, systemPrompt, model } =
      await readJsonBody<ImprovePromptRequest>(request);

    if (!userPrompt?.trim() || !systemPrompt?.trim()) {
      return jsonResponse({ error: "Prompt is required" }, { status: 400 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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

    if (!response.ok) {
      const error = await response.text();
      return jsonResponse(
        { error: `OpenAI error: ${response.status}`, details: error },
        { status: response.status },
      );
    }

    const data = await readJsonResponse<{
      choices?: Array<{ message?: { content?: string } }>;
    }>(response);
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return jsonResponse({ error: "OpenAI returned an empty response" }, { status: 502 });
    }

    return jsonResponse({ content });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
