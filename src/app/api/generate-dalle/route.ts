import { NextRequest, NextResponse } from "next/server";

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { mimeType: "image/png", base64: dataUrl };
  return { mimeType: match[1], base64: match[2] };
}

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
  const { referenceBase64, prompt } = await req.json();

  const { mimeType, base64 } = parseDataUrl(referenceBase64);
  const buffer = Buffer.from(base64, "base64");
  const blob = new Blob([buffer], { type: mimeType });

  const formData = new FormData();
  formData.append("image", blob, "reference.png");
  formData.append("prompt", prompt);
  formData.append("model", "gpt-image-1");
  formData.append("size", "1024x1536");
  formData.append("n", "1");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: getErrorMessage(data, `GPT-IMAGE error: ${response.status}`) },
      { status: response.status },
    );
  }

  return NextResponse.json(data);
}
