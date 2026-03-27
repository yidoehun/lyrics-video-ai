import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const ACR_ACCESS_KEY = process.env.ACR_ACCESS_KEY;
const ACR_ACCESS_SECRET = process.env.ACR_ACCESS_SECRET;
const ACR_HOST = process.env.ACR_HOST;

const SIGN_VERSION = "1";
const SIGNATURE_VERSION = "1";
const HTTP_METHOD = "POST";
const HTTP_URI = "/v1/identify";
const DATA_TYPE = "audio";

type MatchInfo = {
  title?: string;
  artists?: Array<{ name?: string }>;
};

const buildSignature = (timestamp: string): string => {
  if (!ACR_ACCESS_SECRET || !ACR_ACCESS_KEY) {
    throw new Error("ACR credentials are missing.");
  }

  const stringToSign = [
    HTTP_METHOD,
    HTTP_URI,
    ACR_ACCESS_KEY,
    DATA_TYPE,
    SIGNATURE_VERSION,
    timestamp,
  ].join("\n");

  return crypto
    .createHmac("sha1", ACR_ACCESS_SECRET)
    .update(stringToSign)
    .digest("base64");
};

const parseRecognition = (responseData: unknown): { title: string; artist: string } => {
  const data = responseData as {
    metadata?: { music?: MatchInfo[] };
  };
  const firstMatch = data?.metadata?.music?.[0];

  if (!firstMatch?.title) {
    return { title: "", artist: "" };
  }

  return {
    title: firstMatch.title ?? "",
    artist: firstMatch.artists?.map((artist) => artist.name).filter(Boolean).join(", ") ?? "",
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!ACR_ACCESS_KEY || !ACR_ACCESS_SECRET || !ACR_HOST) {
    res.status(500).json({ error: "ACRCloud environment variables are not configured." });
    return;
  }

  try {
    if (!req.body || typeof req.body !== "object" || !("audioBase64" in req.body)) {
      res.status(400).json({ error: "audioBase64 is required." });
      return;
    }

    const body = req.body as { audioBase64?: string };
    if (!body.audioBase64) {
      res.status(400).json({ error: "audioBase64 is required." });
      return;
    }

    const audioBuffer = Buffer.from(body.audioBase64, "base64");
    if (!audioBuffer.length) {
      res.status(400).json({ error: "Invalid audio payload." });
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = buildSignature(timestamp);

    const form = new FormData();
    const sampleFile = new File([audioBuffer], "sample.mp3", { type: "audio/mpeg" });
    form.append("sample", sampleFile);
    form.append("access_key", ACR_ACCESS_KEY);
    form.append("sample_bytes", audioBuffer.byteLength.toString());
    form.append("timestamp", timestamp);
    form.append("signature", signature);
    form.append("data_type", DATA_TYPE);
    form.append("signature_version", SIGNATURE_VERSION);

    const response = await fetch(`https://${ACR_HOST}${HTTP_URI}`, {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(502).json({ error: `ACRCloud request failed: ${errorText}` });
      return;
    }

    const data = (await response.json()) as unknown;
    const recognition = parseRecognition(data);

    res.status(200).json(recognition);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
