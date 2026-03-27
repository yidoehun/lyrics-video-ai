import { createClient } from "@supabase/supabase-js";
import type { LyricsVideoProject } from "../types/project";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://syxesgfcgfgquaxzbnyr.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGVzZ2ZjZ2ZncXVheHpibnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDEwNTYsImV4cCI6MjA4ODExNzA1Nn0.o6Mx6-hz60Bn91IUBhx6Hue9qsoej6KFvAk8UhpO5yo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLE_NAME = "lyrics_projects";

type ProjectRow = {
  id: string;
  title: string;
  artist: string;
  lyrics: string;
  audio_file_name: string | null;
  created_at: string;
  updated_at: string;
};

function mapRowToProject(row: ProjectRow): LyricsVideoProject {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    lyrics: row.lyrics,
    videoStyle: "cinematic",
    audioFileName: row.audio_file_name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveProject(project: LyricsVideoProject): Promise<LyricsVideoProject> {
  const payload: {
    id?: string;
    title: string;
    artist: string;
    lyrics: string;
    audio_file_name: string | null;
  } = {
    title: project.title,
    artist: project.artist,
    lyrics: project.lyrics,
    audio_file_name: project.audioFileName ?? null,
  };
  if (project.id) {
    payload.id = project.id;
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: "id" })
    .select("id,title,artist,lyrics,audio_file_name,created_at,updated_at")
    .single();

  if (error) {
    throw new Error(`Failed to save project: ${error.message}`);
  }

  return mapRowToProject(data as ProjectRow);
}

export async function getProjectById(id: string): Promise<LyricsVideoProject> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id,title,artist,lyrics,audio_file_name,created_at,updated_at")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to load project: ${error.message}`);
  }

  return mapRowToProject(data as ProjectRow);
}

export async function getProjects(): Promise<LyricsVideoProject[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id,title,artist,lyrics,audio_file_name,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load projects: ${error.message}`);
  }

  return ((data ?? []) as ProjectRow[]).map(mapRowToProject);
}
