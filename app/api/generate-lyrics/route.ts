import { NextResponse } from "next/server";

type GenerateLyricsPayload = {
  title?: string;
  artist?: string;
  genre?: string;
  mood?: string;
  keywords?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateLyricsPayload;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const prompt = `당신은 한국어 가사 작사가입니다.
다음 정보를 바탕으로 감성적인 한국어 가사를 작성해 주세요.
- 제목: ${body.title || "제목 없음"}
- 아티스트 스타일: ${body.artist || "없음"}
- 장르: ${body.genre || "pop"}
- 분위기: ${body.mood || "bright"}
- 키워드: ${body.keywords || "추억"}

요구사항:
1) 가사 본문만 출력
2) 줄바꿈으로 라인 구분
3) 최소 8줄 이상
4) 한국어로만 작성`;

    const deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "당신은 한국어 노래 가사 전문 작사가입니다." },
          { role: "user", content: prompt }
        ],
        temperature: 0.9
      })
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      return NextResponse.json(
        { error: `DeepSeek API 오류: ${errorText}` },
        { status: deepseekResponse.status }
      );
    }

    const result = await deepseekResponse.json();
    const lyrics = (result?.choices?.[0]?.message?.content ?? "").trim();

    if (!lyrics) {
      return NextResponse.json({ error: "가사를 생성하지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({ lyrics });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "가사 생성 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
