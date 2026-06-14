"use client";

import { useState, useCallback } from "react";
import { useGenerator } from "../hooks/useGenerator";
import { ModeSelect } from "./ModeSelect";
import { ReferenceUpload } from "./ReferenceUpload";
import { ImagePreview } from "./ImagePreview";

export function GeneratorPage() {
  const [description, setDescription] = useState("");
  const { state, setMode, setReferenceImage, generate } = useGenerator();

  const handleGenerate = useCallback(() => {
    generate(description);
  }, [description, generate]);

  return (
    <div className="container">
      <section className="panel panel-left">
        <h1>AI Scene Generator by Reference</h1>

        <ModeSelect mode={state.mode} onModeChange={setMode} />

        <div className="form">
          <ReferenceUpload
            referenceImage={state.referenceImage ?? null}
            onReferenceChange={setReferenceImage}
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опиши следующую сцену..."
            rows={5}
            disabled={state.loading}
          />

          <button onClick={handleGenerate} disabled={state.loading}>
            {state.loading ? "Генерация..." : "Генерировать"}
          </button>
        </div>

        {state.improvedPrompt && (
          <div className="improved-prompt">
            <label>Улучшенный промпт</label>
            <p>{state.improvedPrompt}</p>
          </div>
        )}

        {state.error && <div className="error">{state.error}</div>}
      </section>

      <section className="panel panel-right">
        <ImagePreview state={state} />
      </section>
    </div>
  );
}
