export async function askAI(
  userPrompt: string,
  systemPrompt: string,
  model = "gpt-4o-mini",
): Promise<string> {
  const response = await fetch("/api/improve-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userPrompt, systemPrompt, model }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `AI error: ${response.status}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response");

  return content;
}
