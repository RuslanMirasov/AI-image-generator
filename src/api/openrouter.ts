import { getErrorMessage, readJson } from "./http";

interface ImprovePromptResponse {
  content?: string;
  error?: string;
}

export async function askAI(
  userPrompt: string,
  systemPrompt: string,
  model: string = "gpt-4o-mini",
): Promise<string> {
  const response = await fetch("/api/improve-prompt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userPrompt,
      systemPrompt,
      model,
    }),
  });

  const data = await readJson<ImprovePromptResponse>(response);
  if (!response.ok) {
    throw new Error(getErrorMessage(data, `AI error: ${response.status}`));
  }

  if (!data?.content) {
    throw new Error("AI returned an empty response");
  }

  return data.content;
}
