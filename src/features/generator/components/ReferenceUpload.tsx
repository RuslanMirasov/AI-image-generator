"use client";

import { useRef } from "react";

interface ReferenceUploadProps {
  referenceImage: string | null;
  onReferenceChange: (image: string | null) => void;
}

export function ReferenceUpload({
  referenceImage,
  onReferenceChange,
}: ReferenceUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      onReferenceChange(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="upload-area" onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleChange}
      />
      {referenceImage ? (
        <>
          <img
            src={referenceImage}
            alt="Reference"
            className="reference-preview"
          />
          <span className="upload-hint">Нажми, чтобы заменить референс</span>
        </>
      ) : (
        <>
          <div className="upload-icon">+</div>
          <span>Загрузи референс персонажа</span>
          <span className="upload-hint">PNG, JPG до 10MB</span>
        </>
      )}
    </div>
  );
}
