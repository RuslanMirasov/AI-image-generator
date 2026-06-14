export interface ApiRequest {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(data: unknown): void;
  setHeader?(name: string, value: string): void;
}

export function readJsonBody<T>(request: ApiRequest): Promise<T> {
  if (typeof request.body === "string") {
    return Promise.resolve(JSON.parse(request.body) as T);
  }

  return Promise.resolve((request.body || {}) as T);
}

export function sendJson(response: ApiResponse, status: number, data: unknown): void {
  response.setHeader?.("Content-Type", "application/json");
  response.status(status).json(data);
}

export async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function parseDataUrl(dataUrl: string): {
  mimeType: string;
  base64: string;
} {
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
