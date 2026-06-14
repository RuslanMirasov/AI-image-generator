import type { AppState } from "@/shared/types";

interface ImagePreviewProps {
  state: AppState;
}

export function ImagePreview({ state }: ImagePreviewProps) {
  const progressPercent =
    state.progress === null ? 0 : Math.min(100, Math.round(state.progress));

  return (
    <>
      <div className="preview-stage">
        {state.loading ? (
          <div className="loader-state">
            <div className="spinner" />
            <div className="progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p>Генерация изображения... {progressPercent}%</p>
            </div>
          </div>
        ) : state.imageUrl ? (
          <img
            src={state.imageUrl}
            alt="Generated image"
            className="generated-image"
          />
        ) : (
          <div className="empty-result">
            <span>Generated scene will appear here</span>
          </div>
        )}
      </div>
      {state.imageUrl && !state.loading && (
        <a
          className="download-button"
          href={state.imageUrl}
          download="scene.png"
        >
          Скачать
        </a>
      )}
    </>
  );
}
