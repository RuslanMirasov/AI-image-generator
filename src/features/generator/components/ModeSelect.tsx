interface ModeSelectProps {
  mode: "sdxl" | "dalle";
  onModeChange: (mode: "sdxl" | "dalle") => void;
}

export function ModeSelect({ mode, onModeChange }: ModeSelectProps) {
  return (
    <div className="mode-select">
      <label>Метод генерации</label>
      <div className="mode-cards">
        <div
          className={`mode-card ${mode === "dalle" ? "active" : ""}`}
          onClick={() => onModeChange("dalle")}
        >
          <div className="mode-title">GPT Image</div>
          <div className="mode-desc">
            Редактирует сцену по референсу и описанию.
          </div>
        </div>
        <div
          className={`mode-card ${mode === "sdxl" ? "active" : ""}`}
          onClick={() => onModeChange("sdxl")}
        >
          <div className="mode-title">ComfyUI + FLUX.1</div>
          <div className="mode-desc">
            Генерация через RunPod ComfyUI workflow.
          </div>
        </div>
      </div>
    </div>
  );
}
