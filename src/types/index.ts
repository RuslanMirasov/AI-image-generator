export interface GenerateRequest {
  description: string;
}

export interface RunpodResponse {
  id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  delayTime?: number;
  executionTime?: number;
  error?: string;
  output?: {
    message?: string;
    status?: string;
    image_url?: string;
    images?: Array<string | { data: string; mime_type?: string }>;
    seed?: number;
  };
}

export interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export interface ImageConfig {
  width: number;
  height: number;
  steps: number;
}

export interface AppState {
  loading: boolean;
  error: string | null;
  imageUrl: string | null;
  improvedPrompt: string | null;
  progress: number | null;
  mode: "sdxl" | "dalle";
  referenceImage?: string | null;
}

//К девушке подошёл муж сзади обнял за плечи и спросил \"Are you ok?\" Она в этот момент повернула к нему колову и смотрит ему в глаза влюбленным нежным взглядом. Муж выглядит на 8-10 лет ее старше, с бородой, одет в традиционную одежду самурая с мечом.
