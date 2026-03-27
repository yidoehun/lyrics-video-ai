export type SongGenre = "pop" | "ballad" | "hiphop" | "rock";
export type Mood = "bright" | "calm" | "sad" | "energetic";
export type AnimationEffect = "fade" | "slide" | "bounce" | "typing" | "shake" | "zoom";

export interface StyleData {
  genrePreset: SongGenre;
  fontFamily: string;
  effect: AnimationEffect;
  fontSize: number;
  fontColor: string;
  accentColor: string;
  backgroundType: "color" | "gradient";
  backgroundColor: string;
  gradientStart: string;
  gradientEnd: string;
}

export interface LyricsData {
  title: string;
  artist: string;
  genre: SongGenre;
  mood: Mood;
  keywords: string;
  lyricsText: string;
}

export interface ProjectRecord {
  id: string;
  user_id: string;
  title: string;
  artist: string | null;
  lyrics_data: LyricsData | null;
  style_data: StyleData | null;
  created_at: string;
}

export const stylePresetByGenre: Record<SongGenre, Omit<StyleData, "fontSize" | "fontFamily">> = {
  pop: {
    genrePreset: "pop",
    effect: "fade",
    fontColor: "#f8f5ff",
    accentColor: "#f472b6",
    backgroundType: "gradient",
    backgroundColor: "#0a0a0f",
    gradientStart: "#6d28d9",
    gradientEnd: "#ec4899"
  },
  ballad: {
    genrePreset: "ballad",
    effect: "typing",
    fontColor: "#f4f7ff",
    accentColor: "#93c5fd",
    backgroundType: "gradient",
    backgroundColor: "#0a0a0f",
    gradientStart: "#1d4ed8",
    gradientEnd: "#7c3aed"
  },
  hiphop: {
    genrePreset: "hiphop",
    effect: "bounce",
    fontColor: "#fef9c3",
    accentColor: "#f59e0b",
    backgroundType: "gradient",
    backgroundColor: "#0a0a0f",
    gradientStart: "#4c1d95",
    gradientEnd: "#be185d"
  },
  rock: {
    genrePreset: "rock",
    effect: "shake",
    fontColor: "#f8fafc",
    accentColor: "#fb7185",
    backgroundType: "gradient",
    backgroundColor: "#0a0a0f",
    gradientStart: "#7f1d1d",
    gradientEnd: "#581c87"
  }
};

export const defaultStyleData: StyleData = {
  ...stylePresetByGenre.pop,
  genrePreset: "pop",
  fontFamily: "Noto Sans KR",
  fontSize: 48
};
