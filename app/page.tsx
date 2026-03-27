"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AuthModal from "@/components/AuthModal";
import LyricsEditor from "@/components/LyricsEditor";
import PreviewCanvas from "@/components/PreviewCanvas";
import StylePanel from "@/components/StylePanel";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  LyricsData,
  Mood,
  ProjectRecord,
  SongGenre,
  StyleData,
  stylePresetByGenre,
  defaultStyleData
} from "@/lib/types";
import type { Session } from "@supabase/supabase-js";

export default function Page() {
  const [activeTab, setActiveTab] = useState<"lyrics" | "style">("lyrics");

  const [title, setTitle] = useState("내 노래");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState<SongGenre>("pop");
  const [mood, setMood] = useState<Mood>("bright");
  const [keywords, setKeywords] = useState("");
  const [lyricsText, setLyricsText] = useState("첫 줄 가사를 입력해 주세요.");

  const [styleData, setStyleData] = useState<StyleData>(defaultStyleData);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionMessage, setRecognitionMessage] = useState("");

  const [authOpen, setAuthOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState("");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentEffect, setCurrentEffect] = useState(styleData.effect);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const lyricsLines = useMemo(
    () =>
      lyricsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [lyricsText]
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const applyGenrePreset = (nextGenre: SongGenre) => {
    setGenre(nextGenre);
    const preset = stylePresetByGenre[nextGenre];
    setStyleData((prev) => ({
      ...prev,
      ...preset,
      genrePreset: nextGenre
    }));
  };

  const slugify = (value: string) =>
    (value || "lyrics-video")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w가-힣-]/g, "")
      .toLowerCase()
      .slice(0, 60);

  const generateLyrics = async () => {
    setIsGenerating(true);
    setStatus("");
    try {
      const response = await fetch("/api/generate-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, artist, genre, mood, keywords })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "가사 생성에 실패했습니다.");
      }
      setLyricsText(data.lyrics ?? "");
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const recognizeMusic = async (file: File) => {
    setIsRecognizing(true);
    setRecognitionMessage("");
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/recognize-music", {
        method: "POST",
        body: form
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "음악 인식에 실패했습니다.");
      }

      const track = data.track as { title?: string; artist?: string; genre?: SongGenre };
      if (track.title) setTitle(track.title);
      if (track.artist) setArtist(track.artist);
      if (track.genre && ["pop", "ballad", "hiphop", "rock"].includes(track.genre)) {
        applyGenrePreset(track.genre);
      }
      setRecognitionMessage(
        `인식 완료: ${track.artist ?? "알 수 없음"} - ${track.title ?? "알 수 없음"}`
      );
    } catch (error) {
      setRecognitionMessage((error as Error).message);
    } finally {
      setIsRecognizing(false);
    }
  };

  const saveProject = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Supabase 환경 변수를 먼저 설정해 주세요.");
      return;
    }
    const {
      data: { session: currentSession }
    } = await supabase.auth.getSession();
    if (!currentSession?.user) {
      setAuthOpen(true);
      setStatus("저장하려면 로그인해 주세요.");
      return;
    }

    const lyricsData: LyricsData = {
      title,
      artist,
      genre,
      mood,
      keywords,
      lyricsText
    };

    const { error } = await supabase.from("projects").insert({
      user_id: currentSession.user.id,
      title,
      artist,
      lyrics_data: lyricsData,
      style_data: styleData
    });

    if (error) {
      setStatus(`저장 실패: ${error.message}`);
      return;
    }
    setStatus("프로젝트를 저장했습니다.");
    await loadProjects();
  };

  const loadProjects = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Supabase 환경 변수를 먼저 설정해 주세요.");
      return;
    }

    const {
      data: { session: currentSession }
    } = await supabase.auth.getSession();
    if (!currentSession?.user) {
      setAuthOpen(true);
      setStatus("불러오려면 로그인해 주세요.");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", currentSession.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(`불러오기 실패: ${error.message}`);
      return;
    }
    setProjects((data as ProjectRecord[]) ?? []);
    setStatus("프로젝트를 불러왔습니다.");
  };

  const applyProject = (project: ProjectRecord) => {
    const lyric = project.lyrics_data;
    const style = project.style_data;

    if (lyric) {
      setTitle(lyric.title ?? project.title);
      setArtist(lyric.artist ?? project.artist ?? "");
      if (lyric.genre) setGenre(lyric.genre);
      if (lyric.mood) setMood(lyric.mood);
      if (lyric.keywords) setKeywords(lyric.keywords);
      if (lyric.lyricsText) setLyricsText(lyric.lyricsText);
    } else {
      setTitle(project.title);
      setArtist(project.artist ?? "");
    }
    if (style) {
      setStyleData({ ...defaultStyleData, ...style });
    }
    setStatus(`"${project.title}" 프로젝트를 적용했습니다.`);
  };

  const toggleRecording = () => {
    const canvas = document.getElementById("preview-canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      setStatus("캔버스를 찾지 못했습니다.");
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      return;
    }

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slugify(title)}.webm`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("WebM 파일 다운로드가 완료되었습니다.");
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setStatus("녹화를 시작했습니다. 버튼을 다시 누르면 종료됩니다.");
  };

  const exportHtml = (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    const lines = lyricsLines.length > 0 ? lyricsLines : ["가사를 입력해 주세요."];
    const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title.replace(/</g, "&lt;")}</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: ${
        styleData.backgroundType === "gradient"
          ? `linear-gradient(135deg, ${styleData.gradientStart}, ${styleData.gradientEnd})`
          : styleData.backgroundColor
      };
      color: ${styleData.fontColor};
      font-family: "${styleData.fontFamily}", sans-serif;
    }
    .frame {
      width: min(92vw, 980px);
      aspect-ratio: 16 / 9;
      border-radius: 18px;
      display: grid;
      place-items: center;
      text-align: center;
      background: rgba(10, 10, 15, 0.36);
      border: 1px solid rgba(255, 255, 255, 0.16);
      font-size: ${styleData.fontSize}px;
      white-space: pre-line;
      padding: 24px;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="frame" id="line"></div>
  <script>
    const lines = ${JSON.stringify(lines)};
    let idx = 0;
    const el = document.getElementById("line");
    const render = () => {
      el.textContent = lines[idx] || "";
      idx = (idx + 1) % Math.max(lines.length, 1);
    };
    render();
    setInterval(render, 1500);
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(title)}.html`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Standalone HTML 파일을 내보냈습니다.");
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <h1>AI로 만드는 나만의 가사 영상</h1>
          <p>가사편집 + 스타일 커스터마이징 + 실시간 미리보기 + 내보내기</p>
        </div>
        <div className="top-actions">
          <button className="ghost-btn" onClick={() => setAuthOpen(true)} type="button">
            {session ? "계정" : "로그인"}
          </button>
          <button className="primary-btn" onClick={saveProject} type="button">
            저장
          </button>
          <button className="ghost-btn" onClick={loadProjects} type="button">
            불러오기
          </button>
        </div>
      </header>

      <main className="grid-layout">
        <section className="left-panel">
          <div className="tabs">
            <button
              className={activeTab === "lyrics" ? "tab active" : "tab"}
              onClick={() => setActiveTab("lyrics")}
              type="button"
            >
              가사편집
            </button>
            <button
              className={activeTab === "style" ? "tab active" : "tab"}
              onClick={() => setActiveTab("style")}
              type="button"
            >
              스타일
            </button>
          </div>

          {activeTab === "lyrics" ? (
            <LyricsEditor
              title={title}
              artist={artist}
              genre={genre}
              mood={mood}
              keywords={keywords}
              lyricsText={lyricsText}
              isGenerating={isGenerating}
              isRecognizing={isRecognizing}
              recognitionMessage={recognitionMessage}
              onTitleChange={setTitle}
              onArtistChange={setArtist}
              onGenreChange={applyGenrePreset}
              onMoodChange={setMood}
              onKeywordsChange={setKeywords}
              onLyricsTextChange={setLyricsText}
              onGenerate={generateLyrics}
              onRecognize={recognizeMusic}
            />
          ) : (
            <StylePanel
              genre={genre}
              styleData={styleData}
              onChange={setStyleData}
              onSetPreset={(preset) => applyGenrePreset(preset)}
            />
          )}

          {projects.length > 0 ? (
            <div className="card project-list">
              <h3>저장된 프로젝트</h3>
              <div className="project-items">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    className="project-item"
                    type="button"
                    onClick={() => applyProject(project)}
                  >
                    <strong>{project.title}</strong>
                    <span>
                      {project.created_at
                        ? new Date(project.created_at).toLocaleString("ko-KR")
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="right-panel">
          <PreviewCanvas
            lines={lyricsLines}
            styleData={styleData}
            currentLineIndex={currentLineIndex}
            onCurrentLineChange={setCurrentLineIndex}
            onEffectChange={setCurrentEffect}
          />
          <div className="card export-card">
            <div className="section-title">내보내기</div>
            <div className="export-buttons">
              <button className="primary-btn" type="button" onClick={toggleRecording}>
                {mediaRecorderRef.current ? "녹화 종료" : "WebM 녹화 시작"}
              </button>
              <button className="ghost-btn" type="button" onClick={exportHtml}>
                Standalone HTML 내보내기
              </button>
            </div>
            <p className="status-line">
              현재 효과: <strong>{currentEffect}</strong>
            </p>
          </div>
          {status ? <p className="status-line">{status}</p> : null}
        </section>
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSessionChange={setSession} />
    </div>
  );
}
