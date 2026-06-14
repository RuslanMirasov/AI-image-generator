export async function generateImageWithDalle(
  referenceBase64: string,
  prompt: string,
): Promise<string> {
  const response = await fetch("/api/generate-dalle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ referenceBase64, prompt }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `GPT-IMAGE error: ${response.status}`);
  }

  const image = data?.data?.[0];
  const imageUrl =
    image?.url ||
    (image?.b64_json ? `data:image/png;base64,${image.b64_json}` : null);
  if (!imageUrl) throw new Error("No image in response");

  return imageUrl;
}
