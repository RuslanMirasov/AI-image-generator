import type { ImageConfig } from "@/shared/types";

const REFERENCE_IMAGE_NAME = "reference.png";
const REFERENCE_DENOISE = 0.72;
const REFERENCE_STEPS = 35;
const REFERENCE_GUIDANCE = 5;

export function createComfyWorkflow(
  prompt: string,
  negativePrompt: string,
  config: ImageConfig,
  hasReferenceImage: boolean,
): Record<string, unknown> {
  const workflow: Record<string, unknown> = {
    "6": {
      inputs: { text: prompt, clip: ["30", 1] },
      class_type: "CLIPTextEncode",
      _meta: { title: "CLIP Text Encode (Positive Prompt)" },
    },
    "8": {
      inputs: { samples: ["31", 0], vae: ["30", 2] },
      class_type: "VAEDecode",
      _meta: { title: "VAE Decode" },
    },
    "27": {
      inputs: { width: config.width, height: config.height, batch_size: 1 },
      class_type: "EmptySD3LatentImage",
      _meta: { title: "EmptySD3LatentImage" },
    },
    "30": {
      inputs: { ckpt_name: "flux1-dev-fp8.safetensors" },
      class_type: "CheckpointLoaderSimple",
      _meta: { title: "Load Checkpoint" },
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
      _meta: { title: "KSampler" },
    },
    "33": {
      inputs: { text: negativePrompt, clip: ["30", 1] },
      class_type: "CLIPTextEncode",
      _meta: { title: "CLIP Text Encode (Negative Prompt)" },
    },
    "35": {
      inputs: {
        guidance: hasReferenceImage ? REFERENCE_GUIDANCE : 3.5,
        conditioning: ["6", 0],
      },
      class_type: "FluxGuidance",
      _meta: { title: "FluxGuidance" },
    },
    "40": {
      inputs: { filename_prefix: "ComfyUI", images: ["8", 0] },
      class_type: "SaveImage",
      _meta: { title: "Save Image" },
    },
  };

  if (hasReferenceImage) {
    delete workflow["27"];
    workflow["41"] = {
      inputs: { image: REFERENCE_IMAGE_NAME, upload: "image" },
      class_type: "LoadImage",
      _meta: { title: "Load Reference Image" },
    };
    workflow["42"] = {
      inputs: { pixels: ["41", 0], vae: ["30", 2] },
      class_type: "VAEEncode",
      _meta: { title: "VAE Encode Reference" },
    };
  }

  return workflow;
}
