"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimationEffect, StyleData } from "@/lib/types";

type PreviewCanvasProps = {
  lines: string[];
  styleData: StyleData;
  currentLineIndex: number;
  onCurrentLineChange: (value: number) => void;
  onEffectChange: (effect: AnimationEffect) => void;
};

const FRAME_DURATION_MS = 1500;
const canvasAnimationClass: Record<AnimationEffect, string> = {
  fade: "effect-fade",
  slide: "effect-slide",
  bounce: "effect-bounce",
  typing: "effect-typing",
  shake: "effect-shake",
  zoom: "effect-zoom"
};

function buildBackground(styleData: StyleData): string {
  if (styleData.backgroundType === "gradient") {
    return `linear-gradient(135deg, ${styleData.gradientStart}, ${styleData.gradientEnd})`;
  }
  return styleData.backgroundColor;
}

export default function PreviewCanvas({
  lines,
  styleData,
  currentLineIndex,
  onCurrentLineChange,
  onEffectChange
}: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const safeLines = useMemo(
    () => (lines.length > 0 ? lines : ["가사를 입력하면 여기에 미리보기가 표시됩니다."]),
    [lines]
  );

  const normalizedIndex = useMemo(() => {
    if (safeLines.length === 0) {
      return 0;
    }
    return Math.max(0, Math.min(currentLineIndex, safeLines.length - 1));
  }, [currentLineIndex, safeLines.length]);

  useEffect(() => {
    onEffectChange(styleData.effect);
  }, [onEffectChange, styleData.effect]);

  useEffect(() => {
    onCurrentLineChange(normalizedIndex);
  }, [normalizedIndex, onCurrentLineChange]);

  useEffect(() => {
    if (!isPlaying || safeLines.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      onCurrentLineChange((currentLineIndex + 1) % safeLines.length);
    }, FRAME_DURATION_MS);

    return () => window.clearInterval(timer);
  }, [currentLineIndex, isPlaying, onCurrentLineChange, safeLines.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const width = 1280;
    const height = 720;
    canvas.width = width;
    canvas.height = height;

    const background = buildBackground(styleData);
    if (background.startsWith("linear-gradient")) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, styleData.gradientStart);
      gradient.addColorStop(1, styleData.gradientEnd);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = background;
    }
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    roundRect(ctx, 40, 40, width - 80, height - 80, 24);
    ctx.fill();

    const line = safeLines[normalizedIndex] ?? "";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${styleData.fontSize}px "${styleData.fontFamily}", sans-serif`;
    ctx.fillStyle = styleData.fontColor;
    wrapText(ctx, line, width / 2, height / 2, width - 220, styleData.fontSize * 1.4);
  }, [normalizedIndex, safeLines, styleData]);

  const goPrev = () => {
    const next = normalizedIndex === 0 ? safeLines.length - 1 : normalizedIndex - 1;
    onCurrentLineChange(next);
  };

  const goNext = () => {
    const next = (normalizedIndex + 1) % safeLines.length;
    onCurrentLineChange(next);
  };

  const progress =
    safeLines.length <= 1 ? 100 : Math.round((normalizedIndex / (safeLines.length - 1)) * 100);

  return (
    <div className="card preview-panel">
      <div className="section-title">미리보기 (16:9)</div>
      <div className="preview-wrap">
        <canvas id="preview-canvas" ref={canvasRef} className={canvasAnimationClass[styleData.effect]} />
      </div>

      <div className="controls-row">
        <button type="button" className="ghost-btn" onClick={goPrev}>
          이전
        </button>
        <button type="button" className="primary-btn" onClick={() => setIsPlaying((prev) => !prev)}>
          {isPlaying ? "일시정지" : "재생"}
        </button>
        <button type="button" className="ghost-btn" onClick={goNext}>
          다음
        </button>
      </div>

      <div className="progress" aria-label="재생 진행도">
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <p className="status-line">
        현재 줄: {normalizedIndex + 1} / {safeLines.length}
      </p>
    </div>
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  }
  if (current) {
    lines.push(current);
  }
  if (lines.length === 0) {
    lines.push(text);
  }

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, x, startY + index * lineHeight);
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
