export type VideoStyle = "cinematic" | "minimal" | "neon";

export interface RecognizedTrack {
  title: string;
  artist: string;
  album?: string;
}

export interface VideoSettings {
  backgroundColor: string;
  textColor: string;
  fontSize: number;
}

export interface LyricsLine {
  text: string;
  startTime?: number;
  endTime?: number;
  time: number;
}

export interface LyricsVideoProject {
  id?: string;
  title: string;
  artist: string;
  lyrics: string;
  audioFileName?: string;
  videoStyle: VideoStyle;
  videoSettings?: VideoSettings;
  lyricsLines?: LyricsLine[];
  createdAt?: string;
  updatedAt?: string;
}