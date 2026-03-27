import crypto from "node:crypto";
import { NextResponse } from "next/server";

type ACRCloudMusic = {
  title?: string;
  artists?: Array<{ name?: string }>;
  genres?: Array<{ name?: string }>;
};

function mapGenre(rawGenre?: string): "pop" | "ballad" | "hiphop" | "rock" | null {
  const normalized = (rawGenre || "").toLowerCase();
  if (normalized.includes("hip hop") || normalized.includes("hiphop") || normalized.includes("rap")) {
    return "hiphop";
  }
  if (normalized.includes("rock")) {
    return "rock";
  }
  if (normalized.includes("ballad")) {
    return "ballad";
  }
  if (normalized.includes("pop")) {
    return "pop";
  }
  return null;
}

function signACR(
  method: string,
  uri: string,
  accessKey: string,
  dataType: string,
  signatureVersion: string,
  timestamp: string,
  accessSecret: string
) {
  const payload = [method, uri, accessKey, dataType, signatureVersion, timestamp].join("\n");
  return crypto.createHmac("sha1", accessSecret).update(payload).digest("base64");
}

export async function POST(request: Request) {
  try {
    const accessKey = process.env.ACRCLOUD_ACCESS_KEY;
    const accessSecret = process.env.ACRCLOUD_ACCESS_SECRET;
    const host = process.env.ACRCLOUD_HOST;

    if (!accessKey || !accessSecret || !host) {
      return NextResponse.json(
        { error: "ACRCloud 환경 변수(ACRCLOUD_ACCESS_KEY, ACRCLOUD_ACCESS_SECRET, ACRCLOUD_HOST)를 설정해 주세요." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "MP3 파일이 필요합니다." }, { status: 400 });
    }

    const endpoint = "/v1/identify";
    const method = "POST";
    const dataType = "audio";
    const signatureVersion = "1";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signACR(
      method,
      endpoint,
      accessKey,
      dataType,
      signatureVersion,
      timestamp,
      accessSecret
    );

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const body = new FormData();
    body.append("sample", new Blob([fileBuffer]), file.name || "sample.mp3");
    body.append("sample_bytes", fileBuffer.byteLength.toString());
    body.append("access_key", accessKey);
    body.append("data_type", dataType);
    body.append("signature_version", signatureVersion);
    body.append("signature", signature);
    body.append("timestamp", timestamp);

    const response = await fetch(`https://${host}${endpoint}`, { method: "POST", body });
    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.status?.msg || "ACRCloud 요청에 실패했습니다." },
        { status: response.status }
      );
    }

    const firstMusic = payload?.metadata?.music?.[0] as ACRCloudMusic | undefined;
    if (!firstMusic) {
      return NextResponse.json(
        { error: "인식 결과가 없습니다. 다른 구간의 음원을 시도해 주세요." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      track: {
        title: firstMusic.title || "",
        artist: firstMusic.artists?.map((artist) => artist.name).filter(Boolean).join(", ") || "",
        genre: mapGenre(firstMusic.genres?.[0]?.name)
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "음악 인식 중 알 수 없는 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
