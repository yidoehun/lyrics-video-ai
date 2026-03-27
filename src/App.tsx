import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { title = "", artist = "" } = req.query as { title?: string; artist?: string };
  const t = String(title).trim();
  const a = String(artist).trim();

  if (!t && !a) return res.status(400).json({ error: "title or artist required" });

  // 1순위: lyrics.ovh (무료, 토큰 불필요)
  try {
    const lyricsRes = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(a || t)}/${encodeURIComponent(t || a)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (lyricsRes.ok) {
      const data = await lyricsRes.json();
      if (data.lyrics && data.lyrics.trim().length > 10) {
        // 줄바꿈 정리: 연속 빈 줄 제거, 각 줄을 싱크 라인으로
        const cleaned = data.lyrics
          .replace(/\r/g, "")
          .split("\n")
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0)
          .join("\n");
        return res.status(200).json({ lyrics: cleaned, source: "lyrics.ovh" });
      }
    }
  } catch (_) { /* 타임아웃 등 무시 */ }

  // 2순위: Genius (토큰 있을 때만)
  const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;
  if (GENIUS_TOKEN) {
    try {
      const q = encodeURIComponent(`${a} ${t}`.trim());
      const searchRes = await fetch(
        `https://api.genius.com/search?q=${q}`,
        { headers: { Authorization: `Bearer ${GENIUS_TOKEN}` }, signal: AbortSignal.timeout(6000) }
      );
      const searchData = await searchRes.json();
      const hit = searchData?.response?.hits?.[0]?.result;
      if (hit) {
        return res.status(200).json({
          lyrics: null,
          geniusUrl: hit.url,
          title: hit.title,
          artist: hit.primary_artist?.name,
          source: "genius_url",
          message: `가사를 찾았습니다: ${hit.url}\n위 주소에서 가사를 복사해 붙여넣어 주세요.`,
        });
      }
    } catch (_) { /* 무시 */ }
  }

  return res.status(200).json({
    lyrics: null,
    message: "가사를 자동으로 가져올 수 없습니다.\n가사를 직접 복사해서 붙여넣어 주세요.",
  });
}