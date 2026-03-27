"use client";

import { AnimationEffect, SongGenre, StyleData } from "@/lib/types";

type StylePanelProps = {
  genre: SongGenre;
  styleData: StyleData;
  onChange: (next: StyleData) => void;
  onSetPreset: (preset: SongGenre) => void;
};

const fonts = ["Noto Sans KR", "Malgun Gothic", "Arial", "Impact", "Pretendard", "Nanum Gothic"];
const effects: AnimationEffect[] = ["fade", "slide", "bounce", "typing", "shake", "zoom"];
const presets: SongGenre[] = ["pop", "ballad", "hiphop", "rock"];

export default function StylePanel({ genre, styleData, onChange, onSetPreset }: StylePanelProps) {
  const patch = <K extends keyof StyleData>(key: K, value: StyleData[K]) =>
    onChange({
      ...styleData,
      [key]: value
    });

  return (
    <div className="card">
      <div className="section-title">스타일</div>

      <div className="genre-preset-grid">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`preset-btn ${genre === preset ? "active" : ""}`}
            onClick={() => onSetPreset(preset)}
          >
            {preset.toUpperCase()}
          </button>
        ))}
      </div>

      <label>
        폰트
        <select value={styleData.fontFamily} onChange={(event) => patch("fontFamily", event.target.value)}>
          {fonts.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </label>

      <label>
        애니메이션
        <select
          value={styleData.effect}
          onChange={(event) => patch("effect", event.target.value as AnimationEffect)}
        >
          {effects.map((effect) => (
            <option key={effect} value={effect}>
              {effect}
            </option>
          ))}
        </select>
      </label>

      <label>
        폰트 크기 ({styleData.fontSize}px)
        <input
          type="range"
          min={20}
          max={96}
          value={styleData.fontSize}
          onChange={(event) => patch("fontSize", Number(event.target.value))}
        />
      </label>

      <div className="style-grid">
        <label>
          글자 색상
          <input
            type="color"
            value={styleData.fontColor}
            onChange={(event) => patch("fontColor", event.target.value)}
          />
        </label>
        <label>
          강조 색상
          <input
            type="color"
            value={styleData.accentColor}
            onChange={(event) => patch("accentColor", event.target.value)}
          />
        </label>
      </div>

      <label>
        배경 타입
        <select
          value={styleData.backgroundType}
          onChange={(event) => patch("backgroundType", event.target.value as "color" | "gradient")}
        >
          <option value="color">단색</option>
          <option value="gradient">그라디언트</option>
        </select>
      </label>

      {styleData.backgroundType === "color" ? (
        <label>
          배경 색상
          <input
            type="color"
            value={styleData.backgroundColor}
            onChange={(event) => patch("backgroundColor", event.target.value)}
          />
        </label>
      ) : (
        <div className="style-grid">
          <label>
            그라디언트 시작
            <input
              type="color"
              value={styleData.gradientStart}
              onChange={(event) => patch("gradientStart", event.target.value)}
            />
          </label>
          <label>
            그라디언트 끝
            <input
              type="color"
              value={styleData.gradientEnd}
              onChange={(event) => patch("gradientEnd", event.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
