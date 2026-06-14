import { NextRequest, NextResponse } from "next/server";
import { createComfyWorkflow } from "@/shared/lib/runpod-workflow";
import type { ImageConfig } from "@/shared/types";

interface RunpodStartRequest {
  prompt: string;
  negativePrompt: string;
  config: ImageConfig;
  referenceBase64?: string | null;
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string" && err) return err;
  }
  return fallback;
}

export async function POST(req: NextRequest) {
  const { prompt, negativePrompt, config, referenceBase64 }: RunpodStartRequest =
    await req.json();

  const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
  const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;

  if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
    return NextResponse.json(
      { error: "RunPod environment variables are not configured" },
      { status: 500 },
    );
  }

  const referenceImage = referenceBase64
    ? referenceBase64.replace(/^data:image\/\w+;base64,/, "")
    : null;

  const workflow = createComfyWorkflow(
    prompt,
    negativePrompt,
    config,
    Boolean(referenceImage),
  );

  const body: Record<string, unknown> = {
    input: {
      workflow,
      ...(referenceImage
        ? { images: [{ name: "reference.png", image: referenceImage }] }
        : {}),
    },
  };

  const response = await fetch(
    `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify(body),
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: getErrorMessage(data, `RunPod error: ${response.status}`) },
      { status: response.status },
    );
  }

  if (!data?.id) {
    return NextResponse.json(
      { error: "RunPod returned no job id" },
      { status: 500 },
    );
  }

  return NextResponse.json({ jobId: data.id });
}
