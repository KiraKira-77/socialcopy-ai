import { NextResponse } from "next/server";
import { getRuntimeEnvVar } from "../../_lib/env";

type SerializablePlatform = {
  id: string;
  name: string;
  limit: number;
  prompt: string;
};

type SerializableTone = {
  id: string;
  name: string;
  prompt: string;
};

type Option = {
  id: string;
  label: string;
  prompt: string;
};

type GenerateCopyRequest = {
  content: string;
  platform: SerializablePlatform;
  tone: SerializableTone;
  language: Option;
  contentMode: Option;
};

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
};

const API_URL_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

const systemInstructionText = `
你是一位世界级的社交媒体文案专家和内容营销策略师。你的任务是将提供的长篇内容提炼、重写，并转换成 3 个独特的、高质量的社交媒体文案。核心规则：
1. 严格遵守目标平台的字符限制，文案必须简洁精炼。
2. 严格遵循用户指定的语气和风格。
3. 必须在每个文案中加入相关的 #Hashtags 和 @提及（如果适用）。
4. 为每个文案生成英文的 image_prompt，用于驱动 Midjourney/DALL·E/Imagen 等图像模型。
5. 输出 JSON 数组，包含 3 个对象，每个对象形如 { "text": "...", "image_prompt": "..." }。
6. 文案内容必须忠实于源内容的主旨。
`.trim();

const responseSchema = {
  type: "ARRAY",
  description:
    "An array containing exactly three versions of the generated social media copy, each with an attached image prompt.",
  items: {
    type: "OBJECT",
    properties: {
      text: {
        type: "STRING",
        description: "The optimized social media copy.",
      },
      image_prompt: {
        type: "STRING",
        description:
          "A detailed English prompt describing the best visual companion for this copy.",
      },
      language: {
        type: "STRING",
        description: "Language code of the output, e.g., zh-CN or en-US.",
      },
      content_mode: {
        type: "STRING",
        description: "Content mode identifier such as 'social', 'summary', or 'script'.",
      },
    },
    required: ["text", "image_prompt", "language", "content_mode"],
  },
};

const buildUserPrompt = (
  content: string,
  platform: SerializablePlatform,
  tone: SerializableTone,
  language: Option,
  contentMode: Option,
) => `
请将下面的原始内容转换为 3 个不同版本的社交媒体文案，并为每一版附带独立的图像生成提示 (Image Prompt)。图像提示内容必须使用英文，描述最适合该文案的视觉画面，方便直接输入到 Midjourney / DALL·E / Imagen 等模型。
1. 目标平台指令: ${platform.prompt}
2. 语气风格指令: ${tone.prompt}
3. 输出语言指令: ${language.prompt}
4. 输出形态指令: ${contentMode.prompt}
5. 内容差异化要求:
   - 版本 1: 侧重于清晰传达信息，并提供一个明确的号召行动 (CTA)。
   - 版本 2: 侧重于互动和参与，使用提问或争议性的观点来吸引评论。
   - 版本 3: 侧重于总结和亮点，作为最精简、最能抓住眼球的版本。
6. 原始内容 (Source Content):
---
${content}
---

7. 输出格式要求: 你的回答必须是一个 JSON 数组，包含 3 个对象 [{ "text": "...", "image_prompt": "...", "language": "${language.id}", "content_mode": "${contentMode.id}" }, ...]，不要包含任何额外的文本或解释。
`.trim();

export async function POST(request: Request) {
  let payload: GenerateCopyRequest;

  try {
    payload = (await request.json()) as GenerateCopyRequest;
  } catch {
    return NextResponse.json({ error: "请求体必须是合法的 JSON。" }, { status: 400 });
  }

  const { content, platform, tone, language, contentMode } = payload ?? {};

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "缺少有效的文案原始内容。" }, { status: 400 });
  }

  if (
    !platform?.prompt ||
    !tone?.prompt ||
    !language?.prompt ||
    !contentMode?.prompt
  ) {
    return NextResponse.json({ error: "平台、语气、语言或内容形态指令缺失。" }, { status: 400 });
  }

  const apiKey = getRuntimeEnvVar("GEMINI_API_KEY");

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY 未配置，无法调用 Gemini 接口。" },
      { status: 500 },
    );
  }

  const userPromptText = buildUserPrompt(
    content,
    platform,
    tone,
    language,
    contentMode,
  );

  const geminiPayload = {
    contents: [{ parts: [{ text: userPromptText }] }],
    systemInstruction: { parts: [{ text: systemInstructionText }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  };

  try {
    const response = await fetch(`${API_URL_BASE}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Gemini API 请求失败: ${response.status} ${errorText}` },
        { status: response.status },
      );
    }

    const result = (await response.json()) as GeminiResponse;
    const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!jsonText) {
      return NextResponse.json({ error: "Gemini 返回数据为空。" }, { status: 502 });
    }

    let parsedCopies: unknown;
    try {
      parsedCopies = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: "Gemini 返回了无效的 JSON。" }, { status: 502 });
    }

    if (!Array.isArray(parsedCopies) || parsedCopies.length !== 3) {
      return NextResponse.json(
        { error: "Gemini 返回结果数量不正确，需包含 3 条文案。" },
        { status: 502 },
      );
    }

    const items = parsedCopies.map((item, index) => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as { text?: unknown }).text !== "string" ||
        typeof (item as { image_prompt?: unknown }).image_prompt !== "string"
      ) {
        throw new Error(`第 ${index + 1} 条文案缺少 text 或 image_prompt 字段。`);
      }

      const typedItem = item as {
        text: string;
        image_prompt: string;
        language?: string;
        content_mode?: string;
      };

      return {
        text: typedItem.text,
        image_prompt: typedItem.image_prompt,
        language: typedItem.language ?? language.id,
        content_mode: typedItem.content_mode ?? contentMode.id,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "调用 Gemini 接口时发生未知错误。";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

