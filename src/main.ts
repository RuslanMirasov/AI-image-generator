import "./style.css";
import { askAI } from "./api/openrouter";
import { generateImage } from "./api/runpod";
import { generateImageWithDalle } from "./api/dalle";
import {
  CHANGE_DESCRIPTION_PROMPT,
  GENERETE_IMAGE_PROMPT,
  WEBTOON_NEGATIVE_PROMPT,
  IMAGE_CONFIG,
} from "./prompts/prompts";
import type { AppState } from "./types";

const app = document.querySelector<HTMLDivElement>("#app")!;

let state: AppState = {
  loading: false,
  error: null,
  imageUrl: null,
  improvedPrompt: null,
  progress: null,
  mode: "dalle",
  referenceImage: null,
};

let progressTimer: number | null = null;
let activeGenerationId = 0;

function render() {
  const progressPercent =
    state.progress === null
      ? 0
      : Math.min(100, Math.round(state.progress));

  app.innerHTML = `
    <div class="container">
      <section class="panel panel-left">
        <h1>AI Scene Generator by Reference</h1>

        <div class="mode-select">
          <label>Метод генерации</label>
          <div class="mode-cards">
            <div class="mode-card ${state.mode === "dalle" ? "active" : ""}" data-mode="dalle">
              <div class="mode-title">GPT Image</div>
              <div class="mode-desc">Редактирует сцену по референсу и описанию.</div>
            </div>
            <div class="mode-card ${state.mode === "sdxl" ? "active" : ""}" data-mode="sdxl">
              <div class="mode-title">ComfyUI + FLUX.1</div>
              <div class="mode-desc">Генерация через RunPod ComfyUI workflow.</div>
            </div>
          </div>
        </div>

        <div class="form">
          <div class="upload-area" id="upload-area">
            <input type="file" id="reference-input" accept="image/*" style="display:none" />
            ${
              state.referenceImage
                ? `
              <img src="${state.referenceImage}" alt="Reference" class="reference-preview" />
              <span class="upload-hint">Нажми, чтобы заменить референс</span>
            `
                : `
              <div class="upload-icon">+</div>
              <span>Загрузи референс персонажа</span>
              <span class="upload-hint">PNG, JPG до 10MB</span>
            `
            }
          </div>

          <textarea
            id="description"
            placeholder="Опиши следующую сцену..."
            rows="5"
            ${state.loading ? "disabled" : ""}
          ></textarea>

          <button id="generate" ${state.loading ? "disabled" : ""}>
            ${state.loading ? "Генерация..." : "Генерировать"}
          </button>
        </div>

        ${
          state.improvedPrompt
            ? `
          <div class="improved-prompt">
            <label>Улучшенный промпт</label>
            <p>${state.improvedPrompt}</p>
          </div>
        `
            : ""
        }

        ${
          state.error
            ? `
          <div class="error">${state.error}</div>
        `
            : ""
        }
      </section>

      <section class="panel panel-right">
        <div class="preview-stage">
          ${
            state.loading
              ? `
            <div class="loader-state">
              <div class="spinner"></div>
              <div class="progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <p>Генерация изображения... ${progressPercent}%</p>
              </div>
            </div>
          `
              : state.imageUrl
                ? `
            <img src="${state.imageUrl}" alt="Generated image" class="generated-image" />
          `
                : `
            <div class="empty-result">
              <span>Generated scene will appear here</span>
            </div>
          `
          }
        </div>

        ${
          state.imageUrl && !state.loading
            ? `
          <a class="download-button" href="${state.imageUrl}" download="scene.png">Скачать</a>
        `
            : ""
        }
      </section>
    </div>
  `;

  document.querySelectorAll(".mode-card").forEach((card) => {
    card.addEventListener("click", () => {
      const mode = (card as HTMLElement).dataset.mode as "sdxl" | "dalle";
      cancelActiveGeneration();
      setState({
        mode,
        loading: false,
        imageUrl: null,
        error: null,
        improvedPrompt: null,
        progress: null,
      });
    });
  });

  document
    .querySelector("#generate")
    ?.addEventListener("click", handleGenerate);

  const uploadArea = document.querySelector("#upload-area");
  const referenceInput =
    document.querySelector<HTMLInputElement>("#reference-input");

  uploadArea?.addEventListener("click", () => referenceInput?.click());

  referenceInput?.addEventListener("change", (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      setState({ referenceImage: readerEvent.target?.result as string });
    };
    reader.readAsDataURL(file);
  });
}

async function handleGenerate() {
  const generationId = ++activeGenerationId;
  const textarea = document.querySelector<HTMLTextAreaElement>("#description");
  const description = textarea?.value.trim();
  if (!description) return;

  if (state.mode === "dalle" && !state.referenceImage) {
    setState({ error: "Загрузи референс персонажа для этого режима" });
    return;
  }

  setState({
    loading: true,
    error: null,
    imageUrl: null,
    improvedPrompt: null,
    progress: 0,
  });
  startProgressSimulation(generationId);

  try {
    const improvedDescription = await askAI(
      description,
      CHANGE_DESCRIPTION_PROMPT,
    );
    if (!isActiveGeneration(generationId)) return;

    const generationPrompt = `${GENERETE_IMAGE_PROMPT}
${improvedDescription}`;
    setState({
      improvedPrompt: generationPrompt,
      progress: nextProgress(18),
    });

    if (state.mode === "sdxl") {
      const imageUrl = await generateImage(
        generationPrompt,
        WEBTOON_NEGATIVE_PROMPT,
        IMAGE_CONFIG,
        state.referenceImage || null,
        (attempt, max) => {
          if (!isActiveGeneration(generationId)) return;
          setState({ progress: nextProgress(18 + Math.round((attempt / max) * 77)) });
        },
      );

      if (!isActiveGeneration(generationId)) return;
      stopProgressSimulation(generationId);
      setState({ loading: false, imageUrl });
    } else {
      const imageUrl = await generateImageWithDalle(
        state.referenceImage!,
        generationPrompt,
      );
      if (!isActiveGeneration(generationId)) return;
      stopProgressSimulation(generationId);
      setState({ loading: false, imageUrl });
    }
  } catch (error) {
    if (!isActiveGeneration(generationId)) return;
    stopProgressSimulation(generationId);
    setState({
      loading: false,
      error: error instanceof Error ? error.message : "Что-то пошло не так",
    });
  }
}

function setState(partial: Partial<AppState>) {
  state = { ...state, ...partial };
  render();
}

function startProgressSimulation(generationId: number) {
  stopProgressSimulation();

  progressTimer = window.setInterval(() => {
    if (!isActiveGeneration(generationId) || !state.loading) {
      stopProgressSimulation(generationId);
      return;
    }

    const current = state.progress ?? 0;
    if (current >= 95) return;

    const increment = current < 35 ? 4 : current < 70 ? 2 : 1;
    setState({ progress: nextProgress(Math.min(95, current + increment)) });
  }, 900);
}

function stopProgressSimulation(generationId?: number) {
  if (generationId !== undefined && !isActiveGeneration(generationId)) return;
  if (progressTimer === null) return;
  window.clearInterval(progressTimer);
  progressTimer = null;
}

function cancelActiveGeneration() {
  activeGenerationId++;
  stopProgressSimulation();
}

function isActiveGeneration(generationId: number): boolean {
  return generationId === activeGenerationId;
}

function nextProgress(value: number): number {
  return Math.max(state.progress ?? 0, Math.min(100, value));
}

render();
