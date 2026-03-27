import { useEffect, useMemo, useState } from "react";
import { getProjectById, getProjects, saveProject } from "./lib/supabase";
import type { ChangeEvent, DragEvent } from "react";
import type { LyricsVideoProject, RecognizedTrack } from "./types/project";

type SyncedLyricLine = {
  key: string;
  time: number;
  text: string;
};

const defaultProject: LyricsVideoProject = {
  title: "",
  artist: "",
  lyrics: "",
  videoStyle: "cinematic",
};

function createInitialProject(): LyricsVideoProject {
  return { ...defaultProject };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("오디오 파일을 읽을 수 없습니다."));
        return;
      }
      const base64 = reader.result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("오디오 파일 읽기 중 오류가 발생했습니다."));
    reader.readAsDataURL(file);
  });
}

function parseSyncedLyrics(lyrics: string): SyncedLyricLine[] {
  const parsed: SyncedLyricLine[] = [];
  const lines = lyrics.split(/\r?\n/);

  lines.forEach((line, lineIndex) => {
    const matches = [...line.matchAll(/\[(\d{1,2}):([0-5]\d)(?:[.:](\d{1,3}))?\]/g)];
    if (matches.length === 0) {
      return;
    }

    const text = line.replace(/\[(\d{1,2}):([0-5]\d)(?:[.:](\d{1,3}))?\]/g, "").trim() || "♪";
    matches.forEach((match, matchIndex) => {
      const minuteText = match[1] ?? "0";
      const secondText = match[2] ?? "0";
      const fractionText = match[3] ?? "0";

      const minutes = Number(minuteText);
      const seconds = Number(secondText);
      const fractionDivisor =
        fractionText.length === 3 ? 1000 : fractionText.length === 2 ? 100 : 10;
      const fraction = Number(fractionText) / fractionDivisor;
      const timestamp = minutes * 60 + seconds + fraction;

      parsed.push({
        key: `${lineIndex}-${matchIndex}-${timestamp}`,
        time: timestamp,
        text,
      });
    });
  });

  return parsed.sort((a, b) => a.time - b.time);
}

function formatPreviewTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const wholeSeconds = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");
  const centiseconds = Math.floor((safeSeconds - Math.floor(safeSeconds)) * 100)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${wholeSeconds}.${centiseconds}`;
}

export default function App() {
  const [project, setProject] = useState<LyricsVideoProject>(createInitialProject);
  const [projectIdInput, setProjectIdInput] = useState("");
  const [savedProjects, setSavedProjects] = useState<LyricsVideoProject[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingList, setIsRefreshingList] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [status, setStatus] = useState<string>("프로젝트를 시작해보세요.");
  const [error, setError] = useState<string | null>(null);

  const syncedLyrics = useMemo(() => parseSyncedLyrics(project.lyrics), [project.lyrics]);
  const previewDuration = useMemo(() => {
    if (syncedLyrics.length === 0) {
      return 0;
    }
    return syncedLyrics[syncedLyrics.length - 1].time + 3;
  }, [syncedLyrics]);
  const activeLyricIndex = useMemo(() => {
    let currentIndex = -1;
    for (let index = 0; index < syncedLyrics.length; index += 1) {
      if (syncedLyrics[index].time <= previewTime) {
        currentIndex = index;
      } else {
        break;
      }
    }
    return currentIndex;
  }, [previewTime, syncedLyrics]);

  const canSave = useMemo(
    () => Boolean(project.title.trim() && project.artist.trim()),
    [project.artist, project.title]
  );

  const onFieldChange =
    (field: keyof LyricsVideoProject) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setProject((prev) => ({ ...prev, [field]: value }));
    };

  const setFileAndRecognize = async (file: File) => {
    if (!file.type.includes("mpeg") && !file.name.toLowerCase().endsWith(".mp3")) {
      setError("MP3 파일만 업로드 가능합니다.");
      return;
    }

    setError(null);
    setUploadedFile(file);
    setStatus("곡 정보를 인식 중입니다...");
    setIsRecognizing(true);

    try {
      const audioBase64 = await fileToBase64(file);

      const response = await fetch("/api/acr-recognize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audioBase64 }),
      });

      if (!response.ok) {
        const failure = (await response.json()) as { error?: string };
        throw new Error(failure.error ?? "곡 인식에 실패했습니다.");
      }

      const payload = (await response.json()) as {
        title: string;
        artist: string;
        album?: string;
      };

      const recognized: RecognizedTrack = {
        title: payload.title,
        artist: payload.artist,
        album: payload.album,
      };

      setProject((prev) => ({
        ...prev,
        title: recognized.title || prev.title,
        artist: recognized.artist || prev.artist,
        audioFileName: file.name,
      }));
      setStatus(`인식 완료: ${recognized.title} - ${recognized.artist}`);
    } catch (recognizeError) {
      const message =
        recognizeError instanceof Error
          ? recognizeError.message
          : "곡 인식 중 알 수 없는 오류가 발생했습니다.";
      setError(message);
      setStatus("곡 인식 실패");
    } finally {
      setIsRecognizing(false);
    }
  };

  const onFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await setFileAndRecognize(file);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    await setFileAndRecognize(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setStatus("프로젝트 저장 중...");

    try {
      const saved = await saveProject(project);
      setProject(saved);
      setProjectIdInput(saved.id ?? "");
      await refreshProjects();
      setStatus(`저장 완료: 프로젝트 ID ${saved.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "저장에 실패했습니다.");
      setStatus("저장 실패");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async () => {
    if (!projectIdInput.trim()) {
      setError("불러올 프로젝트 ID를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus("프로젝트 불러오는 중...");
    try {
      const loaded = await getProjectById(projectIdInput.trim());
      setProject(loaded);
      setStatus(`불러오기 완료: ${loaded.title}`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "불러오기에 실패했습니다.");
      setStatus("불러오기 실패");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProjects = async () => {
    setIsRefreshingList(true);
    try {
      const items = await getProjects();
      setSavedProjects(items);
    } catch (listError) {
      setError(
        listError instanceof Error ? listError.message : "프로젝트 목록을 불러오지 못했습니다."
      );
    } finally {
      setIsRefreshingList(false);
    }
  };

  useEffect(() => {
    void refreshProjects();
  }, []);

  useEffect(() => {
    if (syncedLyrics.length === 0) {
      setPreviewTime(0);
      setIsPreviewPlaying(false);
      return;
    }

    setPreviewTime((prev) => Math.min(prev, previewDuration));
  }, [previewDuration, syncedLyrics.length]);

  useEffect(() => {
    if (!isPreviewPlaying) {
      return;
    }

    const timerId = window.setInterval(() => {
      setPreviewTime((prev) => prev + 0.1);
    }, 100);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isPreviewPlaying]);

  useEffect(() => {
    if (previewDuration <= 0) {
      return;
    }
    if (previewTime >= previewDuration) {
      setPreviewTime(previewDuration);
      setIsPreviewPlaying(false);
    }
  }, [previewDuration, previewTime]);

  const handleLoadFromList = (selected: LyricsVideoProject) => {
    setProject(selected);
    setProjectIdInput(selected.id ?? "");
    setPreviewTime(0);
    setIsPreviewPlaying(false);
    setStatus(`불러오기 완료: ${selected.title}`);
  };

  const togglePreviewPlayback = () => {
    if (syncedLyrics.length === 0) {
      return;
    }
    setIsPreviewPlaying((prev) => !prev);
  };

  const resetPreview = () => {
    setPreviewTime(0);
    setIsPreviewPlaying(false);
  };

  const onPreviewSeek = (event: ChangeEvent<HTMLInputElement>) => {
    setPreviewTime(Number(event.target.value));
    setIsPreviewPlaying(false);
  };

  return (
    <main className="container">
      <header>
        <h1>LyricsVideo AI</h1>
        <p>MP3 업로드로 곡을 자동 인식하고, 프로젝트를 Supabase에 저장하세요.</p>
      </header>

      <section className="card">
        <h2>1) MP3 업로드</h2>
        <div
          className={`dropzone ${isDragActive ? "active" : ""}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <p>{uploadedFile ? `선택된 파일: ${uploadedFile.name}` : "MP3 파일을 여기에 드래그하세요"}</p>
          <label className="file-button">
            파일 선택
            <input type="file" accept=".mp3,audio/mpeg" onChange={onFileInputChange} />
          </label>
        </div>
        {isRecognizing && <p className="loading">곡 인식 중...</p>}
      </section>

      <section className="card form-grid">
        <h2>2) 프로젝트 편집</h2>
        <label>
          제목
          <input value={project.title} onChange={onFieldChange("title")} placeholder="곡 제목" />
        </label>
        <label>
          아티스트
          <input value={project.artist} onChange={onFieldChange("artist")} placeholder="아티스트명" />
        </label>
        <label>
          영상 스타일
          <select value={project.videoStyle} onChange={onFieldChange("videoStyle")}>
            <option value="cinematic">Cinematic</option>
            <option value="minimal">Minimal</option>
            <option value="neon">Neon</option>
          </select>
        </label>
        <label className="full">
          가사
          <textarea
            value={project.lyrics}
            onChange={onFieldChange("lyrics")}
            placeholder="가사를 입력하세요 (예: [00:12.50] 첫 줄 가사)"
            rows={8}
          />
        </label>
      </section>

      <section className="card">
        <h2>3) 저장 / 불러오기</h2>
        <div className="actions">
          <button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <input
            value={projectIdInput}
            onChange={(event) => setProjectIdInput(event.target.value)}
            placeholder="프로젝트 ID"
          />
          <button onClick={handleLoad} disabled={isLoading}>
            {isLoading ? "불러오는 중..." : "불러오기"}
          </button>
          <button onClick={refreshProjects} disabled={isRefreshingList}>
            {isRefreshingList ? "목록 새로고침 중..." : "목록 새로고침"}
          </button>
        </div>
        <div className="project-list">
          {savedProjects.length === 0 ? (
            <p className="empty-list">저장된 프로젝트가 없습니다.</p>
          ) : (
            savedProjects.map((item) => (
              <button
                key={item.id ?? `${item.title}-${item.updatedAt ?? ""}`}
                className="project-item"
                onClick={() => handleLoadFromList(item)}
                type="button"
              >
                <div className="project-item-main">
                  <strong>{item.title || "제목 없음"}</strong>
                  <span>{item.artist || "아티스트 없음"}</span>
                </div>
                <small>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "-"}</small>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <h2>4) 가사 싱크 미리보기</h2>
        <p className="sync-hint">
          LRC 형식 타임코드(`[mm:ss.xx]`)를 가사에 포함하면 재생 시간에 맞춰 현재 줄을 확인할 수
          있습니다.
        </p>
        {syncedLyrics.length === 0 ? (
          <p className="empty-list">
            타임코드 가사가 없습니다. 예시: [00:05.20] 안녕, 첫 줄 가사
          </p>
        ) : (
          <>
            <div className="sync-controls">
              <button onClick={togglePreviewPlayback} type="button">
                {isPreviewPlaying ? "일시정지" : "재생"}
              </button>
              <button className="secondary-button" onClick={resetPreview} type="button">
                처음으로
              </button>
              <span className="sync-time">
                {formatPreviewTime(previewTime)} / {formatPreviewTime(previewDuration)}
              </span>
            </div>
            <input
              className="sync-range"
              type="range"
              min={0}
              max={Math.max(previewDuration, 1)}
              step={0.1}
              value={Math.min(previewTime, Math.max(previewDuration, 1))}
              onChange={onPreviewSeek}
            />
            <ul className="sync-lines">
              {syncedLyrics.map((line, index) => (
                <li
                  key={line.key}
                  className={`sync-line ${index === activeLyricIndex ? "active" : ""}`}
                >
                  <span className="sync-line-time">{formatPreviewTime(line.time)}</span>
                  <span>{line.text}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <footer className="status-area">
        <p>{status}</p>
        {error ? <p className="error">{error}</p> : null}
      </footer>
    </main>
  );
}
