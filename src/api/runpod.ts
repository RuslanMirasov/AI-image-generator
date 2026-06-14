import type { RunpodResponse } from "../types";
import type { ImageConfig } from "../types";
import { getErrorMessage, readJson } from "./http";

const REFERENCE_IMAGE_NAME = "reference.png";
const REFERENCE_DENOISE = 0.72;
const REFERENCE_STEPS = 35;
const REFERENCE_GUIDANCE = 5;

export async function generateImage(
  prompt: string,
  negativePrompt: string,
  config: ImageConfig,
  referenceBase64?: string | null,
  onProgress?: (attempt: number, max: number) => void,
): Promise<string> {
  const referenceImage = referenceBase64
    ? stripDataUrlPrefix(referenceBase64)
    : null;

  const runResponse = await fetch("/api/runpod-generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow: createComfyWorkflow(
        prompt,
        negativePrompt,
        config,
        Boolean(referenceImage),
      ),
      ...(referenceImage
        ? {
            images: [
              {
                name: REFERENCE_IMAGE_NAME,
                image: referenceImage,
              },
            ],
          }
        : {}),
    }),
  });

  const runData = await readJson<RunpodResponse & { error?: string }>(
    runResponse,
  );
  if (!runResponse.ok) {
    throw new Error(getErrorMessage(runData, `RunPod error: ${runResponse.status}`));
  }

  if (!runData?.id) {
    throw new Error("RunPod returned no job id");
  }

  const job: RunpodResponse = runData;
  return await pollJobStatus(job.id, onProgress);
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
      `/api/runpod-status?id=${encodeURIComponent(jobId)}`,
    );

    const job = await readJson<RunpodResponse & { error?: string }>(
      statusResponse,
    );
    if (!statusResponse.ok) {
      throw new Error(
        getErrorMessage(job, `Status check error: ${statusResponse.status}`),
      );
    }

    if (!job) {
      throw new Error("RunPod status returned an empty response");
    }

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

function stripDataUrlPrefix(image: string): string {
  return image.replace(/^data:image\/\w+;base64,/, "");
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

  if (firstImage?.data) {
    return firstImage.data.startsWith("data:image/")
      ? firstImage.data
      : `data:image/png;base64,${firstImage.data}`;
  }

  return job.output?.image_url || null;
}

function createComfyWorkflow(
  prompt: string,
  negativePrompt: string,
  config: ImageConfig,
  hasReferenceImage: boolean,
): Record<string, unknown> {
  const workflow: Record<string, unknown> = {
    "6": {
      inputs: {
        text: prompt,
        clip: ["30", 1],
      },
      class_type: "CLIPTextEncode",
      _meta: {
        title: "CLIP Text Encode (Positive Prompt)",
      },
    },
    "8": {
      inputs: {
        samples: ["31", 0],
        vae: ["30", 2],
      },
      class_type: "VAEDecode",
      _meta: {
        title: "VAE Decode",
      },
    },
    "27": {
      inputs: {
        width: config.width,
        height: config.height,
        batch_size: 1,
      },
      class_type: "EmptySD3LatentImage",
      _meta: {
        title: "EmptySD3LatentImage",
      },
    },
    "30": {
      inputs: {
        ckpt_name: "flux1-dev-fp8.safetensors",
      },
      class_type: "CheckpointLoaderSimple",
      _meta: {
        title: "Load Checkpoint",
      },
    },
    "31": {
      inputs: {
        seed: Math.floor(Math.random() * 1000000),
        steps: hasReferenceImage ? REFERENCE_STEPS : config.steps,
        cfg: 1,
        sampler_name: "euler",
        scheduler: "simple",
        denoise: hasReferenceImage ? REFERENCE_DENOISE : 1,
        model: ["30", 0],
        positive: ["35", 0],
        negative: ["33", 0],
        latent_image: hasReferenceImage ? ["42", 0] : ["27", 0],
      },
      class_type: "KSampler",
      _meta: {
        title: "KSampler",
      },
    },
    "33": {
      inputs: {
        text: negativePrompt,
        clip: ["30", 1],
      },
      class_type: "CLIPTextEncode",
      _meta: {
        title: "CLIP Text Encode (Negative Prompt)",
      },
    },
    "35": {
      inputs: {
        guidance: hasReferenceImage ? REFERENCE_GUIDANCE : 3.5,
        conditioning: ["6", 0],
      },
      class_type: "FluxGuidance",
      _meta: {
        title: "FluxGuidance",
      },
    },
    "40": {
      inputs: {
        filename_prefix: "ComfyUI",
        images: ["8", 0],
      },
      class_type: "SaveImage",
      _meta: {
        title: "Save Image",
      },
    },
  };

  if (hasReferenceImage) {
    delete workflow["27"];
    workflow["41"] = {
      inputs: {
        image: REFERENCE_IMAGE_NAME,
        upload: "image",
      },
      class_type: "LoadImage",
      _meta: {
        title: "Load Reference Image",
      },
    };
    workflow["42"] = {
      inputs: {
        pixels: ["41", 0],
        vae: ["30", 2],
      },
      class_type: "VAEEncode",
      _meta: {
        title: "VAE Encode Reference",
      },
    };
  }

  return workflow;
}
