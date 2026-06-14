import { getErrorMessage, readJson } from "./http";

interface GenerateGptImageResponse {
  imageUrl?: string;
  error?: string;
}

export async function generateImageWithDalle(
  referenceBase64: string,
  prompt: string,
): Promise<string> {
  const response = await fetch("/api/generate-gpt-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      referenceBase64,
      prompt,
    }),
  });

  const data = await readJson<GenerateGptImageResponse>(response);
  if (!response.ok) {
    throw new Error(getErrorMessage(data, `GPT-IMAGE error: ${response.status}`));
  }

  if (!data?.imageUrl) {
    throw new Error("No image in response");
  }

  return data.imageUrl;
}
