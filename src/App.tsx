import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getProjectById, getProjects, saveProject } from "./lib/supabase";
import type { ChangeEvent, DragEvent } from "react";
import type { LyricsVideoProject, LyricsLine, VideoSettings } from "./types/project";

const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  backgroundColor: "#000000",
  textColor: "#ffffff",
  fontSize: 64,
};

const defaultProject: LyricsVideoProject = {
  title: "",
  artist: "",
  lyrics: "",
  videoStyle: "cinematic",
  videoSettings: { ...DEFAULT_VIDEO_SETTINGS },
};

export default function App() {
  const [project, setProject] = useState<LyricsVideoProject>(defaultProject);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyricsLines, setLyricsLines] = useState<LyricsLine[]>([]);
  const [currentLine, setCurrentLine] = useState<number>(-1);
  const [projectId, setProjectId] = useState<string>("");
  const [savedProjects, setSavedProjects] = useState<LyricsVideoProject[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [showFullscreen, setShowFullscreen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const lines = project.lyrics
      .split("\n")
      .map((text, i) => ({ text: text.trim(), time: i * 4 }))
      .filter((l) => l.text);
    setLyricsLines(lines);
  }, [project.lyrics]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      const t = audio.currentTime;
      let idx = -1;
      for (let i = lyricsLines.length - 1; i >= 0; i--) {
        if (t >= lyricsLines[i].time) { idx = i; break; }
      }
      setCurrentLine(idx);
    };
    audio.addEventListener("timeupdate", onTime);
    return () => audio.removeEventListener("timeupdate", onTime);
  }, [lyricsLines]);

  const handleFileChange = useCallback((file: File) => {
    if (!file.type.startsWith("audio/")) return;
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    const name = file.name.replace(/\.[^.]+$/, "");
    const parts = name.split(/[-_]\s*/);
    setProject((p) => ({
      ...p,
      title: parts[1]?.trim() || name,
      artist: parts[0]?.trim() || "",
    }));
    setStatusMsg("파일 로드 완료");
  }, []);

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
  };

  const searchLyrics = async () => {
    if (!project.title && !project.artist) return;
    setIsSearching(true);
    setStatusMsg("가사 검색 중...");
    try {
      const res = await fetch(
        `/api/lyrics-search?title=${encodeURIComponent(project.title)}&artist=${encodeURIComponent(project.artist)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.lyrics) {
          setProject((p) => ({ ...p, lyrics: data.lyrics }));
          setStatusMsg("가사 검색 완료!");
        } else {
          setStatusMsg("가사를 찾지 못했습니다.");
        }
      }
    } catch {
      setStatusMsg("가사 검색 실패");
    } finally {
      setIsSearching(false);
    }
  };

  const setSyncTime = (idx: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    setLyricsLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, time: audio.currentTime } : l))
    );
  };

  const handleSave = async () => {
    const id = await saveProject(project);
            setProjectId(id.id ?? "");
    setStatusMsg("저장 완료!");
  };

  const handleLoad = async () => {
    if (!projectId) return;
    const p = await getProjectById(projectId);
    if (p) { setProject(p); setStatusMsg("불러오기 완료!"); }
  };

  const handleRefreshList = async () => {
    const list = await getProjects();
    setSavedProjects(list);
  };

  const displayLine = useMemo(() => {
    if (currentLine >= 0 && lyricsLines[currentLine]) {
      return lyricsLines[currentLine].text;
    }
    return lyricsLines[0]?.text || "가사 미리보기";
  }, [currentLine, lyricsLines]);

  const settings = project.videoSettings ?? DEFAULT_VIDEO_SETTINGS;

  return (
    <div className="container">
      <header className="app-header">
        <h1 className="app-title">LyricsVideo AI</h1>
        <p className="app-subtitle">MP3를 업로드하면 곡을 자동 인식하고 가사를 검색합니다</p>
      </header>
      <div className="section-card">
        <p className="section-title">01 &nbsp;·&nbsp; MP3 업로드</p>
        <div
          className="upload-area"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{ borderColor: isDragging ? "var(--accent)" : undefined }}
        >
          {audioFile ? (
            <>
              <div className="upload-icon">🎵</div>
              <p className="file-name">{audioFile.name}</p>
              <p>클릭하여 파일 변경</p>
            </>
          ) : (
            <>
              <div className="upload-icon">☁️</div>
              <p>MP3 파일을 드래그하거나 클릭하여 선택</p>
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={onInputChange} />
        {audioUrl && (
          <div className="audio-player-wrap">
            <audio ref={audioRef} src={audioUrl} controls />
          </div>
        )}
      </div>
      <div className="section-card">
        <p className="section-title">02 &nbsp;·&nbsp; 프로젝트 편집</p>
        <div className="form-row">
          <div className="form-group">
            <label>곡 제목</label>
            <input value={project.title} onChange={(e) => setProject((p) => ({ ...p, title: e.target.value }))} placeholder="곡 제목" />
          </div>
          <div className="form-group">
            <label>아티스트</label>
            <input value={project.artist} onChange={(e) => setProject((p) => ({ ...p, artist: e.target.value }))} placeholder="아티스트명" />
          </div>
        </div>
        <div className="form-group">
          <label>가사 (각 줄 = 한 화면에 표시될 라인)</label>
          <textarea value={project.lyrics} onChange={(e) => setProject((p) => ({ ...p, lyrics: e.target.value }))} placeholder="가사를 입력하세요." />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={searchLyrics} disabled={isSearching} style={{ marginTop: 8 }}>
          {isSearching ? "⏳ 검색 중..." : "🔍 가사 자동 검색"}
        </button>
      </div>
      <div className="section-card">
        <p className="section-title">03 &nbsp;·&nbsp; 영상 스타일</p>
        <div className="style-controls">
          <div className="form-group">
            <label>배경 색상</label>
            <div className="color-input-wrap">
              <input type="color" value={settings.backgroundColor} onChange={(e) => setProject((p) => ({ ...p, videoSettings: { ...settings, backgroundColor: e.target.value } }))} />
              <input type="text" value={settings.backgroundColor} onChange={(e) => setProject((p) => ({ ...p, videoSettings: { ...settings, backgroundColor: e.target.value } }))} />
            </div>
          </div>
          <div className="form-group">
            <label>글씨 색상</label>
            <div className="color-input-wrap">
              <input type="color" value={settings.textColor} onChange={(e) => setProject((p) => ({ ...p, videoSettings: { ...settings, textColor: e.target.value } }))} />
              <input type="text" value={settings.textColor} onChange={(e) => setProject((p) => ({ ...p, videoSettings: { ...settings, textColor: e.target.value } }))} />
            </div>
          </div>
          <div className="form-group">
            <label>글씨 크기</label>
            <div className="range-wrap">
              <div className="range-label">
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>크기</span>
                <span className="range-value">{settings.fontSize}px</span>
              </div>
              <input type="range" min={32} max={160} value={settings.fontSize} onChange={(e) => setProject((p) => ({ ...p, videoSettings: { ...settings, fontSize: Number(e.target.value) } }))} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <button className="btn btn-primary" onClick={() => setShowFullscreen(true)}>▶ 가사 영상 미리보기</button>
        </div>
        <div className="preview-area" style={{ marginTop: 16 }}>
          <div className="preview-inner" style={{ backgroundColor: settings.backgroundColor }}>
            <span className="preview-lyrics-text" style={{ color: settings.textColor, fontSize: Math.round(settings.fontSize * 0.45) }}>
              {displayLine}
            </span>
          </div>
        </div>
        {statusMsg && <div className="status-bar"><span className="status-dot" />{statusMsg}</div>}
      </div>
      {lyricsLines.length > 0 && (
        <div className="section-card">
          <p className="section-title">04 &nbsp;·&nbsp; 가사 싱크 설정</p>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 14 }}>음악 재생 중 각 라인의 [싱크] 버튼을 눌러 타이밍을 설정하세요</p>
          <div className="sync-list">
            {lyricsLines.map((line, idx) => (
              <div key={idx} className={`sync-item${idx === currentLine ? " active" : ""}`}>
                <span className="sync-time">{String(Math.floor(line.time / 60)).padStart(2, "0")}:{String(Math.floor(line.time % 60)).padStart(2, "0")}</span>
                <span className="sync-text">{line.text}</span>
                <button className="sync-btn" onClick={() => setSyncTime(idx)}>싱크</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="section-card">
        <p className="section-title">05 &nbsp;·&nbsp; 저장 / 불러오기</p>
        <div className="save-load-row">
          <input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="프로젝트 ID" />
          <button className="btn btn-primary btn-sm" onClick={handleSave}>저장</button>
          <button className="btn btn-secondary btn-sm" onClick={handleLoad}>불러오기</button>
          <button className="btn btn-secondary btn-sm" onClick={handleRefreshList}>목록</button>
        </div>
        {savedProjects.length > 0 && (
          <div className="project-list">
            {savedProjects.map((p, i) => (
              <div key={i} className="project-item" onClick={() => setProject(p)}>
                <div className="project-item-title">{p.title || "제목 없음"}</div>
                <div className="project-item-meta">{p.artist}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showFullscreen && (
        <div className="fullscreen-player" style={{ backgroundColor: settings.backgroundColor }}>
          <button className="fullscreen-close" onClick={() => setShowFullscreen(false)}>✕</button>
          <span className="fullscreen-lyrics" style={{ color: settings.textColor, fontSize: settings.fontSize }}>{displayLine}</span>
        </div>
      )}
    </div>
  );
}