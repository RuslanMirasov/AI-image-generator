"use client";

import { useState, useRef, useCallback } from "react";
import { askAI } from "../api/improvePrompt";
import { generateImage } from "../api/runpod";
import { generateImageWithDalle } from "../api/dalle";
import {
  CHANGE_DESCRIPTION_PROMPT,
  GENERETE_IMAGE_PROMPT,
  WEBTOON_NEGATIVE_PROMPT,
  IMAGE_CONFIG,
} from "@/shared/prompts";
import type { AppState } from "@/shared/types";

export function useGenerator() {
  const [state, setStateRaw] = useState<AppState>({
    loading: false,
    error: null,
    imageUrl: null,
    improvedPrompt: null,
    progress: null,
    mode: "dalle",
    referenceImage: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const activeGenerationId = useRef(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateState = useCallback((partial: Partial<AppState>) => {
    setStateRaw((prev) => ({ ...prev, ...partial }));
  }, []);

  const stopProgressSimulation = useCallback(() => {
    if (progressTimerRef.current !== null) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const startProgressSimulation = useCallback(
    (generationId: number) => {
      stopProgressSimulation();
      progressTimerRef.current = setInterval(() => {
        if (generationId !== activeGenerationId.current) {
          stopProgressSimulation();
          return;
        }
        setStateRaw((prev) => {
          if (!prev.loading) {
            stopProgressSimulation();
            return prev;
          }
          const current = prev.progress ?? 0;
          if (current >= 95) return prev;
          const increment = current < 35 ? 4 : current < 70 ? 2 : 1;
          return { ...prev, progress: Math.min(95, current + increment) };
        });
      }, 900);
    },
    [stopProgressSimulation],
  );

  const setMode = useCallback(
    (mode: "sdxl" | "dalle") => {
      activeGenerationId.current++;
      stopProgressSimulation();
      setStateRaw((prev) => ({
        ...prev,
        mode,
        loading: false,
        error: null,
        imageUrl: null,
        improvedPrompt: null,
        progress: null,
      }));
    },
    [stopProgressSimulation],
  );

  const setReferenceImage = useCallback(
    (referenceImage: string | null) => {
      updateState({ referenceImage });
    },
    [updateState],
  );

  const generate = useCallback(
    async (description: string) => {
      if (!description.trim()) return;

      const { mode, referenceImage } = stateRef.current;

      if (mode === "dalle" && !referenceImage) {
        updateState({ error: "Загрузи референс персонажа для этого режима" });
        return;
      }

      const generationId = ++activeGenerationId.current;
      const isActive = () => generationId === activeGenerationId.current;

      updateState({
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
        if (!isActive()) return;

        const generationPrompt = `${GENERETE_IMAGE_PROMPT}\n${improvedDescription}`;
        updateState({ improvedPrompt: generationPrompt, progress: 18 });

        let imageUrl: string;

        if (mode === "sdxl") {
          imageUrl = await generateImage(
            generationPrompt,
            WEBTOON_NEGATIVE_PROMPT,
            IMAGE_CONFIG,
            referenceImage || null,
            (attempt, max) => {
              if (!isActive()) return;
              updateState({
                progress: 18 + Math.round((attempt / max) * 77),
              });
            },
          );
        } else {
          imageUrl = await generateImageWithDalle(
            referenceImage!,
            generationPrompt,
          );
        }

        if (!isActive()) return;
        stopProgressSimulation();
        updateState({ loading: false, imageUrl });
      } catch (error) {
        if (!isActive()) return;
        stopProgressSimulation();
        updateState({
          loading: false,
          error:
            error instanceof Error ? error.message : "Что-то пошло не так",
        });
      }
    },
    [updateState, startProgressSimulation, stopProgressSimulation],
  );

  return { state, setMode, setReferenceImage, generate };
}
