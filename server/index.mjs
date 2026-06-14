import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const API_PORT = Number(process.env.API_PORT || 8787);
const APP_PORT = Number(process.env.PORT || 3000);
const DIST_DIR = resolve("dist");
const API_ONLY = process.argv.includes("--api-only");

loadEnvFile(".env.local");
loadEnvFile(".env");

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    if (API_ONLY) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    await serveStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Unknown server error",
    });
  }
});

server.listen(API_ONLY ? API_PORT : APP_PORT, () => {
  const mode = API_ONLY ? "API" : "app";
  const port = API_ONLY ? API_PORT : APP_PORT;
  console.log(`${mode} server listening on http://localhost:${port}`);
});

async function handleApi(request, response, url) {
  if (url.pathname === "/api/improve-prompt") {
    await improvePrompt(request, response);
    return;
  }

  if (url.pathname === "/api/generate-gpt-image") {
    await generateGptImage(request, response);
    return;
  }

  if (url.pathname === "/api/runpod-generate") {
    await runpodGenerate(request, response);
    return;
  }

  if (url.pathname === "/api/runpod-status") {
    await runpodStatus(response, url);
    return;
  }

  sendJson(response, 404, { error: "API route not found" });
}

async function improvePrompt(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const { userPrompt, systemPrompt, model } = await readJsonBody(request);
  if (!userPrompt?.trim() || !systemPrompt?.trim()) {
    sendJson(response, 400, { error: "Prompt is required" });
    return;
  }

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("OPENAI_API_KEY", "VITE_OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1000,
    }),
  });

  const data = await readJsonResponse(upstream);
  if (!upstream.ok) {
    sendJson(response, upstream.status, {
      error: `OpenAI error: ${upstream.status}`,
      details: data,
    });
    return;
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    sendJson(response, 502, { error: "OpenAI returned an empty response" });
    return;
  }

  sendJson(response, 200, { content });
}

async function generateGptImage(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const { referenceBase64, prompt } = await readJsonBody(request);
  if (!referenceBase64 || !prompt?.trim()) {
    sendJson(response, 400, {
      error: "Reference image and prompt are required",
    });
    return;
  }

  const { mimeType, base64 } = parseDataUrl(referenceBase64);
  const formData = new FormData();
  formData.append(
    "image",
    new Blob([Buffer.from(base64, "base64")], { type: mimeType }),
    "reference.png",
  );
  formData.append("prompt", prompt);
  formData.append("model", "gpt-image-1");
  formData.append("size", "1024x1536");
  formData.append("n", "1");

  const upstream = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("OPENAI_API_KEY", "VITE_OPENAI_API_KEY")}`,
    },
    body: formData,
  });

  const data = await readJsonResponse(upstream);
  if (!upstream.ok) {
    sendJson(response, upstream.status, {
      error: `OpenAI image error: ${upstream.status}`,
      details: data,
    });
    return;
  }

  const image = data?.data?.[0];
  const imageUrl =
    image?.url ||
    (image?.b64_json ? `data:image/png;base64,${image.b64_json}` : null);

  if (!imageUrl) {
    sendJson(response, 502, { error: "OpenAI returned no image" });
    return;
  }

  sendJson(response, 200, { imageUrl });
}

async function runpodGenerate(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const { workflow, images } = await readJsonBody(request);
  if (!workflow || typeof workflow !== "object") {
    sendJson(response, 400, { error: "Workflow is required" });
    return;
  }

  const endpointId = requireEnv("RUNPOD_ENDPOINT_ID", "VITE_RUNPOD_ENDPOINT_ID");
  const upstream = await fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requireEnv("RUNPOD_API_KEY", "VITE_RUNPOD_API_KEY")}`,
    },
    body: JSON.stringify({
      input: {
        workflow,
        ...(images?.length ? { images } : {}),
      },
    }),
  });

  const data = await readJsonResponse(upstream);
  if (!upstream.ok) {
    sendJson(response, upstream.status, {
      error: `RunPod error: ${upstream.status}`,
      details: data,
    });
    return;
  }

  sendJson(response, 200, data);
}

async function runpodStatus(response, url) {
  const jobId = url.searchParams.get("id");
  if (!jobId) {
    sendJson(response, 400, { error: "Job id is required" });
    return;
  }

  const endpointId = requireEnv("RUNPOD_ENDPOINT_ID", "VITE_RUNPOD_ENDPOINT_ID");
  const upstream = await fetch(
    `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
    {
      headers: {
        Authorization: `Bearer ${requireEnv("RUNPOD_API_KEY", "VITE_RUNPOD_API_KEY")}`,
      },
    },
  );

  const data = await readJsonResponse(upstream);
  if (!upstream.ok) {
    sendJson(response, upstream.status, {
      error: `RunPod status error: ${upstream.status}`,
      details: data,
    });
    return;
  }

  sendJson(response, 200, data);
}

async function serveStatic(response, pathname) {
  const normalizedPath = normalize(decodeURIComponent(pathname)).replace(
    /^(\.\.[/\\])+/,
    "",
  );
  const filePath = resolve(
    DIST_DIR,
    normalizedPath === "/" ? "index.html" : normalizedPath.slice(1),
  );

  if (!filePath.startsWith(DIST_DIR)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  const finalPath = existsSync(filePath)
    ? filePath
    : join(DIST_DIR, "index.html");

  response.writeHead(200, {
    "Content-Type": contentType(finalPath),
  });
  createReadStream(finalPath).pipe(response);
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON request body");
  }
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(data));
}

function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return {
      mimeType: "image/png",
      base64: dataUrl,
    };
  }

  return {
    mimeType: match[1],
    base64: match[2],
  };
}

function requireEnv(name, fallbackName) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : "");
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = valueParts.join("=").trim();
    }
  }
}

function contentType(filePath) {
  switch (extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
