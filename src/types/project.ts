export type VideoStyle = "cinematic" | "minimal" | "neon";

export interface RecognizedTrack {
  title: string;
  artist: string;
  album?: string;
}

export interface LyricsVideoProject {
  id?: string;
  title: string;
  artist: string;
  lyrics: string;
  videoStyle: VideoStyle;
  audioFileName?: string;
  createdAt?: string;
  updatedAt?: string;
}
