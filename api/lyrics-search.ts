import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { title = "", artist = "" } = req.query as { title?: string; artist?: string };

  if (!title && !artist) {
    return res.status(400).json({ error: "title or artist required" });
  }

  try {
    // Genius API로 검색
    const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;
    const query = encodeURIComponent(`${artist} ${title}`.trim());

    if (GENIUS_TOKEN) {
      const searchRes = await fetch(
        `https://api.genius.com/search?q=${query}`,
        { headers: { Authorization: `Bearer ${GENIUS_TOKEN}` } }
      );
      const searchData = await searchRes.json();
      const hit = searchData?.response?.hits?.[0]?.result;

      if (hit) {
        return res.status(200).json({
          lyrics: null,
          title: hit.title,
          artist: hit.primary_artist?.name,
          geniusUrl: hit.url,
          source: "genius",
          message: "가사 URL을 찾았습니다. 직접 가사를 붙여넣어 주세요.",
        });
      }
    }

    // Genius 토큰 없거나 결과 없으면 빈 응답
    return res.status(200).json({
      lyrics: null,
      message: "가사를 자동으로 가져올 수 없습니다. 직접 가사를 붙여넣어 주세요.",
    });
  } catch (err) {
    console.error("lyrics-search error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}