import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
  const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;

  if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
    return NextResponse.json(
      { error: "RunPod environment variables are not configured" },
      { status: 500 },
    );
  }

  const response = await fetch(
    `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status/${jobId}`,
    {
      headers: {
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
      },
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: `Status check error: ${response.status}` },
      { status: response.status },
    );
  }

  return NextResponse.json(data);
}
