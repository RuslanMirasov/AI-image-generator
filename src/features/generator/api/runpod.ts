import type { ImageConfig, RunpodResponse } from "@/shared/types";

export async function generateImage(
  prompt: string,
  negativePrompt: string,
  config: ImageConfig,
  referenceBase64?: string | null,
  onProgress?: (attempt: number, max: number) => void,
): Promise<string> {
  const startResponse = await fetch("/api/generate-runpod", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, negativePrompt, config, referenceBase64 }),
  });

  const startData = await startResponse.json().catch(() => null);

  if (!startResponse.ok) {
    throw new Error(startData?.error || `RunPod error: ${startResponse.status}`);
  }

  const jobId: string | undefined = startData?.jobId;
  if (!jobId) throw new Error("RunPod returned no job id");

  return await pollJobStatus(jobId, onProgress);
}

async function pollJobStatus(
  jobId: string,
  onProgress?: (attempt: number, max: number) => void,
): Promise<string> {
  const maxAttempts = 60;
  const interval = 3000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(interval);
    onProgress?.(attempt + 1, maxAttempts);

    const statusResponse = await fetch(
      `/api/generate-runpod/status/${jobId}`,
    );
    const job = (await statusResponse
      .json()
      .catch(() => null)) as (RunpodResponse & { error?: string }) | null;

    if (!statusResponse.ok) {
      throw new Error(
        job?.error || `Status check error: ${statusResponse.status}`,
      );
    }

    if (!job) throw new Error("RunPod status returned an empty response");

    console.log("Job status:", job.status, "attempt:", attempt + 1);

    if (job.status === "COMPLETED") {
      const imageUrl = extractImage(job);
      if (!imageUrl) throw new Error("No image in response");
      return imageUrl;
    }

    if (job.status === "FAILED") {
      throw new Error(job.error || "Image generation failed on Runpod");
    }
  }

  throw new Error("Generation timeout after 3 minutes");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractImage(job: RunpodResponse): string | null {
  const message = job.output?.message;
  if (message) {
    return message.startsWith("data:image/")
      ? message
      : `data:image/png;base64,${message}`;
  }

  const firstImage = job.output?.images?.[0];
  if (typeof firstImage === "string") {
    return firstImage.startsWith("data:image/")
      ? firstImage
      : `data:image/png;base64,${firstImage}`;
  }

  if (firstImage && typeof firstImage === "object" && "data" in firstImage) {
    const data = firstImage.data;
    return data.startsWith("data:image/")
      ? data
      : `data:image/png;base64,${data}`;
  }

  return job.output?.image_url || null;
}
