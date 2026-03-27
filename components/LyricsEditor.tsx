"use client";

import { ChangeEvent } from "react";
import { Mood, SongGenre } from "@/lib/types";

type Props = {
  title: string;
  artist: string;
  genre: SongGenre;
  mood: Mood;
  keywords: string;
  lyricsText: string;
  isGenerating: boolean;
  isRecognizing: boolean;
  recognitionMessage: string;
  onTitleChange: (value: string) => void;
  onArtistChange: (value: string) => void;
  onGenreChange: (value: SongGenre) => void;
  onMoodChange: (value: Mood) => void;
  onKeywordsChange: (value: string) => void;
  onLyricsTextChange: (value: string) => void;
  onGenerate: () => Promise<void>;
  onRecognize: (file: File) => Promise<void>;
};

const genres: SongGenre[] = ["pop", "ballad", "hiphop", "rock"];
const moods: Mood[] = ["bright", "calm", "sad", "energetic"];

const labelKo: Record<SongGenre, string> = {
  pop: "팝",
  ballad: "발라드",
  hiphop: "힙합",
  rock: "록",
};

const moodKo: Record<Mood, string> = {
  bright: "밝음",
  calm: "차분함",
  sad: "슬픔",
  energetic: "에너지",
};

export default function LyricsEditor({
  title,
  artist,
  genre,
  mood,
  keywords,
  lyricsText,
  isGenerating,
  isRecognizing,
  recognitionMessage,
  onTitleChange,
  onArtistChange,
  onGenreChange,
  onMoodChange,
  onKeywordsChange,
  onLyricsTextChange,
  onGenerate,
  onRecognize
}: Props) {
  const lines = lyricsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await onRecognize(file);
    event.target.value = "";
  };

  return (
    <div className="card">
      <div className="section-title">곡 정보</div>
      <div className="field-grid">
        <label>
          제목
          <input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="노래 제목" />
        </label>
        <label>
          아티스트
          <input value={artist} onChange={(e) => onArtistChange(e.target.value)} placeholder="아티스트명" />
        </label>
        <label>
          장르
          <select value={genre} onChange={(e) => onGenreChange(e.target.value as SongGenre)}>
            {genres.map((item) => (
              <option key={item} value={item}>
                {labelKo[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          무드
          <select value={mood} onChange={(e) => onMoodChange(e.target.value as Mood)}>
            {moods.map((item) => (
              <option key={item} value={item}>
                {moodKo[item]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="section-title">AI 가사 생성 (DeepSeek)</div>
      <div className="inline-form">
        <input
          value={keywords}
          onChange={(e) => onKeywordsChange(e.target.value)}
          placeholder="키워드 예: 여름밤, 첫사랑, 바다"
        />
        <button className="primary-btn" type="button" disabled={isGenerating} onClick={onGenerate}>
          {isGenerating ? "생성 중..." : "가사 생성"}
        </button>
      </div>

      <div className="section-title">수동 가사 편집</div>
      <textarea
        rows={10}
        value={lyricsText}
        onChange={(e) => onLyricsTextChange(e.target.value)}
        placeholder="한 줄에 한 문장씩 입력하세요."
      />

      <div className="section-title">실시간 라인 목록</div>
      <div className="lyrics-list">
        {lines.length === 0 ? <p className="muted">가사를 입력해 주세요.</p> : null}
        {lines.map((line, idx) => (
          <div key={`${line}-${idx}`} className="lyrics-line">
            <span>{idx + 1}</span>
            <p>{line}</p>
          </div>
        ))}
      </div>

      <div className="section-title">MP3 인식 (ACRCloud)</div>
      <div className="inline-form">
        <input type="file" accept="audio/mpeg,.mp3" onChange={onFileChange} />
        <button className="ghost-btn" type="button" disabled={isRecognizing}>
          {isRecognizing ? "인식 중..." : "파일 선택 후 인식"}
        </button>
      </div>
      {recognitionMessage ? <p className="muted">{recognitionMessage}</p> : null}
    </div>
  );
}
