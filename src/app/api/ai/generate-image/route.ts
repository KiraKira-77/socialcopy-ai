import { NextResponse } from "next/server";
import { getRuntimeEnvVar } from "../../_lib/env";

type GenerateImageRequest = {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16";
  apiKey?: string;
};

const IMAGEN_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict";

const NEGATIVE_PROMPT =
  "low quality, bad anatomy, deformed, worst quality, noise, blurry, watermark";

const isValidAspectRatio = (value: string): value is "1:1" | "16:9" | "9:16" =>
  value === "1:1" || value === "16:9" || value === "9:16";

export async function POST(request: Request) {
  let payload: GenerateImageRequest;

  try {
    payload = (await request.json()) as GenerateImageRequest;
  } catch {
    return NextResponse.json({ error: "请求体必须是合法的 JSON。" }, { status: 400 });
  }

  const { prompt, aspectRatio = "1:1", apiKey: clientApiKey } = payload ?? {};

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "缺少可用的配图提示。" }, { status: 400 });
  }

  if (!isValidAspectRatio(aspectRatio)) {
    return NextResponse.json({ error: "不支持的图片比例。" }, { status: 400 });
  }

  const normalizedApiKey =
    typeof clientApiKey === "string" ? clientApiKey.trim() : "";
  const apiKey = normalizedApiKey || getRuntimeEnvVar("GEMINI_API_KEY");

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY 未配置，且请求体未提供 apiKey，无法调用 Imagen 接口。",
      },
      { status: 500 },
    );
  }

  const imagenPayload = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio,
      negativePrompt: NEGATIVE_PROMPT,
    },
  };

  try {
    const response = await fetch(`${IMAGEN_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(imagenPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Imagen API 请求失败: ${response.status} ${errorText}` },
        { status: response.status },
      );
    }

    const result = (await response.json()) as {
      predictions?: { bytesBase64Encoded?: string }[];
    };

    const base64Data = result?.predictions?.[0]?.bytesBase64Encoded;

    if (!base64Data) {
      return NextResponse.json({ error: "Imagen 返回数据为空。" }, { status: 502 });
    }

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64Data}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "调用 Imagen 接口时发生未知错误。";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
