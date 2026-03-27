import type { VercelRequest, VercelResponse } from "@vercel/node";

const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;

interface GeniusHit {
  result?: {
      title?: string;
          primary_artist?: { name?: string };
              url?: string;
                };
                }

                interface GeniusSearchResponse {
                  response?: {
                      hits?: GeniusHit[];
                        };
                        }

                        function generatePlaceholderLyrics(title: string, artist: string): string {
                          return `[${artist} - ${title}]\n\n가사를 여기에 입력하세요\n\n각 줄이 하나의 가사 라인입니다\n\n음악에 맞춰 자동으로 싱크됩니다\n\n줄을 나눠서 입력해 주세요\n\n빈 줄은 자동으로 제외됩니다`;
                          }

                          export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
                            if (req.method !== "POST") {
                                res.status(405).json({ error: "Method not allowed" });
                                    return;
                                      }

                                        const body = req.body as { title?: string; artist?: string };
                                          const title = body?.title?.trim();
                                            const artist = body?.artist?.trim();

                                              if (!title) {
                                                  res.status(400).json({ error: "title is required" });
                                                      return;
                                                        }

                                                          if (!GENIUS_TOKEN) {
                                                              const dummyLyrics = generatePlaceholderLyrics(title, artist ?? "");
                                                                  res.status(200).json({ lyrics: dummyLyrics, source: "placeholder" });
                                                                      return;
                                                                        }

                                                                          try {
                                                                              const query = encodeURIComponent(`${title} ${artist ?? ""}`.trim());
                                                                                  const searchRes = await fetch(
                                                                                        `https://api.genius.com/search?q=${query}`,
                                                                                              { headers: { Authorization: `Bearer ${GENIUS_TOKEN}` } }
                                                                                                  );

                                                                                                      if (!searchRes.ok) {
                                                                                                            throw new Error(`Genius search failed: ${searchRes.status}`);
                                                                                                                }

                                                                                                                    const searchData = (await searchRes.json()) as GeniusSearchResponse;
                                                                                                                        const hit = searchData?.response?.hits?.[0];

                                                                                                                            if (!hit?.result?.url) {
                                                                                                                                  const placeholder = generatePlaceholderLyrics(title, artist ?? "");
                                                                                                                                        res.status(200).json({ lyrics: placeholder, source: "placeholder" });
                                                                                                                                              return;
                                                                                                                                                  }

                                                                                                                                                      const placeholder = generatePlaceholderLyrics(title, artist ?? "");
                                                                                                                                                          res.status(200).json({
                                                                                                                                                                lyrics: placeholder,
                                                                                                                                                                      geniusUrl: hit.result.url,
                                                                                                                                                                            source: "genius_url",
                                                                                                                                                                                });
                                                                                                                                                                                  } catch (err) {
                                                                                                                                                                                      const message = err instanceof Error ? err.message : "Unknown error";
                                                                                                                                                                                          res.status(500).json({ error: message });
                                                                                                                                                                                            }
                                                                                                                                                                                            }