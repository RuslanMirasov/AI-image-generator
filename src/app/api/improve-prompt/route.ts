import { NextRequest, NextResponse } from "next/server";

function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string" && err) return err;
    if (err && typeof err === "object" && "message" in err) {
      const msg = (err as { message?: unknown }).message;
      if (typeof msg === "string" && msg) return msg;
    }
  }
  return fallback;
}

export async function POST(req: NextRequest) {
  const { userPrompt, systemPrompt, model = "gpt-4o-mini" } =
    await req.json();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1000,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: getErrorMessage(data, `AI error: ${response.status}`) },
      { status: response.status },
    );
  }

  return NextResponse.json(data);
}
