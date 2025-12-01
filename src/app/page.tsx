"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Clipboard,
  Download,
  Image as ImageIcon,
  Laugh,
  Loader,
  Meh,
  Monitor,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";

type Platform = {
  id: string;
  name: string;
  icon: LucideIcon;
  limit: number;
  color: string;
  max: string;
  prompt: string;
};

type Tone = {
  id: string;
  name: string;
  icon: LucideIcon;
  prompt: string;
};

type GeneratedResult = {
  id: number;
  text: string;
  image_prompt: string;
  imageUrl: string | null;
};

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
};

type ImagenResponse = {
  predictions?: { bytesBase64Encoded?: string }[];
};

declare global {
  interface Window {
    __SOCIALCOPY_API_KEY?: string;
  }
}

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
const IMAGEN_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict";
const NEGATIVE_PROMPT =
  "low quality, bad anatomy, deformed, worst quality, noise, blurry, watermark";

const API_KEY_STORAGE_KEY = "socialcopy_api_key";
const MAX_CHARS = 5000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

const PLATFORMS: Platform[] = [
  {
    id: "twitter",
    name: "X / Twitter",
    icon: Users,
    limit: 280,
    color: "bg-blue-600",
    max: "280 字符",
    prompt:
      "目标为 X/Twitter，必须控制在 280 字符以内，使用短句和不超过 3 个高度相关的 Hashtag。",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: Monitor,
    limit: 2200,
    color: "bg-pink-600",
    max: "2200 字符",
    prompt:
      "目标为 Instagram Caption，可多段换行并使用大量 Emoji 来提升排版，结尾附加明确 CTA。",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: BookOpen,
    limit: 3000,
    color: "bg-sky-700",
    max: "3000 字符",
    prompt:
      "目标为 LinkedIn Post，保持专业、正式的语气，使用 5-7 个要点列表来组织内容，引导专业互动。",
  },
  {
    id: "xiaohongshu",
    name: "小红书",
    icon: Sparkles,
    limit: 1000,
    color: "bg-red-500",
    max: "1000 字",
    prompt:
      "目标为小红书笔记，用种草/分享口吻，开头用吸睛标题或表情，内容分段并使用小红书常见 Hashtag。",
  },
];

const TONES: Tone[] = [
  {
    id: "professional",
    name: "专业 Professional",
    icon: Zap,
    prompt: "保持专业、正式的语气，客观表达，避免夸张符号。",
  },
  {
    id: "humorous",
    name: "幽默 Humorous",
    icon: Laugh,
    prompt: "用幽默、风趣的语气，适度加入流行梗和表情符号。",
  },
  {
    id: "concise",
    name: "简洁 Concise",
    icon: Meh,
    prompt: "突出 1-2 个核心亮点，用最短的文字清晰传达信息。",
  },
];

const responseSchema = {
  type: "ARRAY",
  description:
    "An array containing exactly three versions of the generated social media copy, each including text plus a detailed image prompt.",
  items: {
    type: "OBJECT",
    properties: {
      text: { type: "STRING" },
      image_prompt: { type: "STRING" },
    },
    propertyOrdering: ["text", "image_prompt"],
  },
};

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const readApiKey = (): string => {
  if (typeof window !== "undefined") {
    if (window.__SOCIALCOPY_API_KEY) {
      return window.__SOCIALCOPY_API_KEY;
    }
    try {
      const stored = window.localStorage.getItem(API_KEY_STORAGE_KEY);
      if (stored) {
        window.__SOCIALCOPY_API_KEY = stored;
        return stored;
      }
    } catch {
      // ignore storage errors
    }
  }
  return process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";
};

const buildSystemInstruction = (audience: string) => {
  const trimmed = audience.trim();
  const audienceInstruction = trimmed
    ? `特别注意：你现在正在为目标受众 **${trimmed}** 撰写文案，请使用该群体常用的语言与文化偏好。`
    : "如果用户没有指定目标受众，则使用通用的、专业的社交媒体风格。";
  return `
你是一位世界级的社交媒体文案专家和内容营销策略师。
你的任务是将提供的长篇内容提炼、重写，并转换成 3 个独特的、高质量的社交媒体文案。
核心规则：
1. 严格遵守目标平台的字符限制，文案必须简洁精炼。
2. 严格遵循用户指定的语气和风格。
3. 必须在每个文案中加入相关的 #Hashtags 或 @提及（如果适用）。
4. 必须将输出格式化为 JSON 数组，包含 3 个独立对象 {text: string, image_prompt: string}。
5. 文案内容必须忠实于源内容的主旨。
${audienceInstruction}`.trim();
};

const buildUserPrompt = (
  content: string,
  platform: Platform,
  tone: Tone,
) => `
请将下面的原始内容转换为 3 个不同版本的社交媒体文案。

同时，为每个文案生成一个详细的、高质量 **配图提示（Image Prompt）**，描述最适合该文案的视觉内容。图像提示必须使用 **英文**，以便直接用于 Midjourney / DALL·E / Imagen。

1. 目标平台指令: ${platform.prompt}
2. 语气风格指令: ${tone.prompt}
3. 内容差异化要求:
   - 版本 1: 侧重清晰传达信息，并提供一个明确的 CTA。
   - 版本 2: 侧重互动和参与，使用提问或争议观点吸引评论。
   - 版本 3: 侧重总结与亮点，打造最精简且抓人眼球的版本。

原始内容 (Source Content):
---
${content}
---

输出格式：返回 JSON 数组，包含 3 个对象 [{ "text": "...", "image_prompt": "..." }, ...]，不要附带额外解释。`.trim();

async function generateCopyWithGemini(
  content: string,
  platform: Platform,
  tone: Tone,
  audience: string,
  maxRetries: number = MAX_RETRIES,
): Promise<GeneratedResult[]> {
  const apiKey = readApiKey();
  if (!apiKey) {
    throw new Error("未配置 Gemini API Key，请设置 NEXT_PUBLIC_GEMINI_API_KEY。");
  }

  const apiUrl = `${GEMINI_API_URL}?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: buildUserPrompt(content, platform, tone) }] }],
    systemInstruction: { parts: [{ text: buildSystemInstruction(audience) }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API 请求失败: ${response.status} ${errorText}`);
      }

      const result = (await response.json()) as GeminiResponse;
      const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) {
        throw new Error("Gemini 返回数据为空。");
      }

      const parsed = JSON.parse(jsonText) as {
        text?: string;
        image_prompt?: string;
      }[];

      if (
        !Array.isArray(parsed) ||
        parsed.length !== 3 ||
        parsed.some(
          (item) =>
            typeof item?.text !== "string" ||
            typeof item?.image_prompt !== "string",
        )
      ) {
        throw new Error("Gemini 返回的 JSON 结构不符合预期。");
      }

      const now = Date.now();
      return parsed.map((item, index) => ({
        id: now + index,
        text: item.text!,
        image_prompt: item.image_prompt!,
        imageUrl: null,
      }));
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error instanceof Error
          ? error
          : new Error("生成文案失败，请稍后重试。");
      }
      const delayMs = Math.pow(2, attempt) * RETRY_BASE_DELAY_MS;
      await delay(delayMs);
    }
  }

  throw new Error("生成文案失败，请稍后重试。");
}

async function generateImageWithImagen(
  prompt: string,
  maxRetries: number = MAX_RETRIES,
): Promise<string> {
  const apiKey = readApiKey();
  if (!apiKey) {
    throw new Error("未配置 Gemini API Key，无法调用 Imagen。");
  }

  const apiUrl = `${IMAGEN_API_URL}?key=${apiKey}`;
  const payload = {
    instances: [{ prompt }],
    parameters: { sampleCount: 1, aspectRatio: "1:1", negativePrompt: NEGATIVE_PROMPT },
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Imagen API 请求失败: ${response.status} ${errorText}`);
      }

      const result = (await response.json()) as ImagenResponse;
      const base64Data = result?.predictions?.[0]?.bytesBase64Encoded;
      if (!base64Data) {
        throw new Error("Imagen 返回数据为空。");
      }
      return `data:image/png;base64,${base64Data}`;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error instanceof Error
          ? error
          : new Error("图像生成失败，请稍后重试。");
      }
      const delayMs = Math.pow(2, attempt) * RETRY_BASE_DELAY_MS;
      await delay(delayMs);
    }
  }

  throw new Error("图像生成失败，请稍后重试。");
}

const copyToClipboard = async (
  text: string,
  onCopied: (value: boolean) => void,
) => {
  if (!text) {
    return;
  }
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    onCopied(true);
    setTimeout(() => onCopied(false), 2000);
  } catch (error) {
    console.error("复制失败", error);
  }
};

const downloadImage = (dataUrl: string, filename = "socialcopy-image.png") => {
  if (!dataUrl) {
    return;
  }
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

type PlatformCardProps = {
  platform: Platform;
  isSelected: boolean;
  onSelect: (platform: Platform) => void;
};

const PlatformCard = ({
  platform,
  isSelected,
  onSelect,
}: PlatformCardProps) => (
  <button
    type="button"
    onClick={() => onSelect(platform)}
    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
      isSelected
        ? "border-purple-400 bg-gray-700"
        : "border-gray-700 bg-gray-800 hover:border-purple-400/40"
    }`}
  >
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${platform.color}`}
    >
      <platform.icon size={18} />
    </div>
    <div className="flex flex-col">
      <span className="text-sm font-semibold text-white">{platform.name}</span>
      <span className="text-xs text-gray-400">{platform.max}</span>
    </div>
  </button>
);

type ResultCardProps = {
  result: GeneratedResult;
  platform: Platform;
  onUpdate: (id: number, url: string) => void;
};

const ResultCard = ({ result, platform, onUpdate }: ResultCardProps) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedImageUrl, setCopiedImageUrl] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const charCount = result.text.length;
  const isOverLimit = charCount > platform.limit;

  const handleGenerateImage = useCallback(async () => {
    if (imageLoading || !result.image_prompt) {
      return;
    }
    try {
      setImageLoading(true);
      setImageError(null);
      setCopiedImageUrl(false);
      const imageUrl = await generateImageWithImagen(result.image_prompt);
      onUpdate(result.id, imageUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "图像生成失败，请稍后重试。";
      setImageError(message);
    } finally {
      setImageLoading(false);
    }
  }, [imageLoading, onUpdate, result.id, result.image_prompt]);

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/80 p-5 shadow-lg shadow-black/20 transition hover:border-purple-500/50">
      <div className="custom-scrollbar mb-4 h-32 overflow-y-auto whitespace-pre-wrap text-gray-100">
        {result.text}
      </div>

      <div className="flex items-center justify-between border-t border-gray-700 pt-3 text-sm">
        <div className="flex space-x-4">
          <span
            className={`font-medium ${
              isOverLimit ? "text-red-400" : "text-purple-300"
            }`}
          >
            字数：{charCount} / {platform.limit}
          </span>
          <span className="text-gray-400">
            预计阅读：{Math.max(1, Math.ceil(charCount / 60))} 秒
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs italic text-gray-500">
        *结果已根据 {platform.name} 的常见写作规范进行优化。
      </p>

      <div className="mt-4 rounded-xl border border-gray-600/80 bg-gray-700/40 p-4">
        <h4 className="mb-2 flex items-center text-sm font-semibold text-purple-200">
          <ImageIcon size={16} className="mr-2" />
          配图提示（英文）
        </h4>
        <p className="text-xs text-gray-300">{result.image_prompt}</p>
        <button
          type="button"
          onClick={() => copyToClipboard(result.image_prompt, setCopiedPrompt)}
          className={`mt-3 w-full rounded-lg py-2 text-sm font-semibold transition ${
            copiedPrompt
              ? "bg-green-600 text-white"
              : "bg-gray-600 text-white hover:bg-gray-500"
          }`}
          disabled={copiedPrompt}
        >
          {copiedPrompt ? "图像提示已复制" : "复制图像提示"}
        </button>
      </div>

      <div className="mt-4 border-t border-gray-700 pt-4">
        <h4 className="mb-3 text-sm font-semibold text-white">图像生成</h4>
        {result.imageUrl ? (
          <div className="space-y-3">
            <img
              src={result.imageUrl}
              alt="Generated visual"
              className="w-full rounded-xl border border-gray-700 bg-gray-900/40 object-cover"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => copyToClipboard(result.imageUrl!, setCopiedImageUrl)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  copiedImageUrl
                    ? "bg-green-600 text-white"
                    : "bg-gray-600 text-white hover:bg-gray-500"
                }`}
              >
                {copiedImageUrl ? "图片 URL 已复制" : "复制图片 URL"}
              </button>
              <button
                type="button"
                onClick={() => downloadImage(result.imageUrl!)}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-purple-600 py-2 text-sm font-semibold text-white hover:bg-purple-500"
              >
                <Download size={14} />
                下载图片
              </button>
            </div>
            <button
              type="button"
              onClick={handleGenerateImage}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-purple-400 py-2 text-sm font-semibold text-purple-200 hover:bg-purple-500/10"
            >
              <RefreshCw size={14} className={imageLoading ? "animate-spin" : ""} />
              重新生成
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-600 p-4 text-center text-sm text-gray-400">
            {imageLoading ? (
              <div className="flex flex-col items-center gap-3 text-purple-300">
                <Loader size={20} className="animate-spin" />
                <p>正在生成配图...</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateImage}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2 font-semibold text-white hover:bg-purple-500"
              >
                <ImageIcon size={16} />
                生成配图
              </button>
            )}
            {imageError && (
              <p className="mt-2 text-xs text-red-400">{imageError}</p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => copyToClipboard(result.text, setCopiedText)}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-lg font-bold transition ${
          copiedText
            ? "bg-green-600 text-white"
            : "bg-purple-600 text-white hover:bg-purple-500"
        }`}
        disabled={copiedText}
      >
        {copiedText ? (
          "文案已复制"
        ) : (
          <>
            <Clipboard size={18} />
            复制文案
          </>
        )}
      </button>
    </div>
  );
};

type MobileGenerateBarProps = {
  disabled: boolean;
  loading: boolean;
  onGenerate: () => void;
};

const MobileGenerateBar = ({
  disabled,
  loading,
  onGenerate,
}: MobileGenerateBarProps) => (
  <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-800 bg-gray-950/90 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] backdrop-blur lg:hidden">
    <button
      type="button"
      onClick={onGenerate}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-lg font-bold ${
        disabled
          ? "bg-gray-700 text-gray-400"
          : "bg-purple-600 text-white shadow-lg shadow-purple-500/40 hover:bg-purple-500"
      }`}
    >
      {loading ? (
        <>
          <Loader size={20} className="animate-spin" />
          AI 正在生成...
        </>
      ) : (
        <>
          <Send size={20} />
          生成结果
        </>
      )}
    </button>
  </div>
);

export default function HomePage() {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [inputContent, setInputContent] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(
    PLATFORMS[0],
  );
  const [selectedTone, setSelectedTone] = useState<Tone>(TONES[0]);
  const [targetAudience, setTargetAudience] = useState("");
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const charCount = inputContent.length;
  const isInputValid = charCount > 0 && charCount <= MAX_CHARS;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored =
      window.__SOCIALCOPY_API_KEY ??
      window.localStorage.getItem(API_KEY_STORAGE_KEY) ??
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ??
      "";
    if (stored) {
      window.__SOCIALCOPY_API_KEY = stored;
    }
    setApiKeyInput(stored);
  }, []);

  const updateResultImageUrl = useCallback((id: number, url: string) => {
    setResults((prev) =>
      prev.map((item) => (item.id === id ? { ...item, imageUrl: url } : item)),
    );
  }, []);

  const handleSaveApiKey = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const value = apiKeyInput.trim();
    window.__SOCIALCOPY_API_KEY = value || undefined;
    try {
      if (value) {
        window.localStorage.setItem(API_KEY_STORAGE_KEY, value);
      } else {
        window.localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  }, [apiKeyInput]);

  const handleGenerate = useCallback(async () => {
    if (!isInputValid || loading) {
      return;
    }
    setLoading(true);
    setGenerationError(null);
    setResults([]);
    try {
      const copies = await generateCopyWithGemini(
        inputContent,
        selectedPlatform,
        selectedTone,
        targetAudience,
      );
      setResults(copies);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "生成文案失败，请稍后再试。";
      setGenerationError(message);
    } finally {
      setLoading(false);
    }
  }, [
    inputContent,
    isInputValid,
    loading,
    selectedPlatform,
    selectedTone,
    targetAudience,
  ]);

  const InputConfigPanel = useMemo(
    () => (
      <div className="order-2 flex flex-col space-y-6 rounded-3xl border border-gray-800 bg-gray-900/70 p-6 lg:order-1 lg:w-full xl:sticky xl:top-6 xl:h-fit xl:space-y-7 xl:border-gray-800 xl:bg-gray-900/60 xl:p-8 xl:shadow-2xl">
        <div className="space-y-3 rounded-2xl border border-gray-800 bg-gray-950/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">
              0. Gemini API Key
            </p>
            {apiKeySaved && (
              <span className="text-xs text-green-400">已保存</span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            请输入可调用 Gemini / Imagen 的 API Key，仅保存在本地浏览器。
          </p>
          <input
            type="password"
            className="w-full rounded-xl border border-gray-700 bg-gray-800 p-3 text-sm text-gray-100 placeholder:text-gray-500 focus:border-purple-500 focus:outline-none"
            placeholder="AIza..."
            value={apiKeyInput}
            onChange={(event) => setApiKeyInput(event.target.value)}
          />
          <button
            type="button"
            onClick={handleSaveApiKey}
            className="w-full rounded-xl bg-purple-600 py-2 text-sm font-semibold text-white hover:bg-purple-500"
          >
            保存 API Key
          </button>
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">
            1. 原始内容输入
          </h2>
          <textarea
            className="custom-scrollbar h-48 w-full rounded-2xl border border-gray-700 bg-gray-800 p-4 text-sm text-gray-100 placeholder:text-gray-500 focus:border-purple-500 focus:outline-none md:h-56 lg:h-64 xl:h-72 resize-y"
            placeholder="粘贴或输入需要优化的长篇内容，最多 5000 字符..."
            value={inputContent}
            onChange={(event) => setInputContent(event.target.value)}
            maxLength={MAX_CHARS}
          />
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span
                className={`font-semibold ${
                  charCount > MAX_CHARS ? "text-red-400" : "text-gray-400"
                }`}
              >
                字数：{charCount} / {MAX_CHARS}
              </span>
              <button
                type="button"
                onClick={() => setInputContent("")}
                className="text-purple-300 hover:text-purple-100"
              >
                清空
              </button>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-800">
              <div
                className={`h-full rounded-full ${
                  charCount > MAX_CHARS
                    ? "bg-red-500"
                    : "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400"
                }`}
                style={{
                  width: `${Math.min(100, (charCount / MAX_CHARS) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-white">
            2. 目标人群 & 平台配置
          </h3>
          <div className="space-y-3">
            <label className="flex items-center text-sm font-semibold text-gray-300">
              <Target size={16} className="mr-2 text-red-400" />
              目标受众（可选）
            </label>
            <textarea
              className="h-32 w-full rounded-2xl border border-gray-700 bg-gray-800 p-3 text-sm text-gray-100 placeholder:text-gray-500 focus:border-red-500 focus:outline-none md:h-40 lg:h-48 xl:h-56 resize-y"
              placeholder="例：25-35 岁女性、关注健康生活；或 B2B SaaS 创始人..."
              value={targetAudience}
              onChange={(event) => setTargetAudience(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-300">目标平台</p>
          <div className="grid grid-cols-2 gap-4">
            {PLATFORMS.map((platform) => (
              <PlatformCard
                key={platform.id}
                platform={platform}
                isSelected={selectedPlatform.id === platform.id}
                onSelect={setSelectedPlatform}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-300">文案语气 / 风格</p>
          <div className="grid grid-cols-3 gap-4">
            {TONES.map((tone) => (
              <button
                type="button"
                key={tone.id}
                onClick={() => setSelectedTone(tone)}
                className={`rounded-2xl p-3 text-center text-sm font-semibold transition ${
                  selectedTone.id === tone.id
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/40"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <tone.icon size={18} className="mx-auto mb-1" />
                {tone.name}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!isInputValid || loading}
          className={`hidden items-center justify-center gap-2 rounded-2xl py-4 text-lg font-extrabold transition lg:flex ${
            isInputValid && !loading
              ? "bg-purple-600 text-white hover:bg-purple-500"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          {loading ? (
            <>
              <Loader size={20} className="animate-spin" />
              AI 正在思考...
            </>
          ) : (
            <>
              <Send size={20} />
              生成文案与配图建议
            </>
          )}
        </button>

        {generationError && (
          <p className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {generationError}
          </p>
        )}
      </div>
    ),
    [
      apiKeyInput,
      apiKeySaved,
      charCount,
      generationError,
      handleGenerate,
      handleSaveApiKey,
      inputContent,
      isInputValid,
      loading,
      selectedPlatform.id,
      selectedTone.id,
      targetAudience,
    ],
  );

  const OutputPanel = useMemo(
    () => (
      <div className="order-1 space-y-6 rounded-3xl border border-gray-800 bg-gray-950/60 p-6 lg:order-2 lg:p-8">
        <h2 className="text-xl font-bold text-white">
          3. AI 生成结果（{selectedPlatform.name} 风格）
        </h2>

        {loading && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-10 text-center text-purple-300">
            <Loader size={28} className="mx-auto mb-4 animate-spin" />
            正在根据配置生成 3 条不同的文案和图像提示，请稍候...
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/40 p-10 text-center text-gray-400">
            <Sparkles size={28} className="mx-auto mb-4 text-purple-300" />
            输入内容并点击生成后，这里将展示 3 条优化后的文案与配图建议。
          </div>
        )}

        <div className="grid gap-6">
          {results.map((result) => (
            <ResultCard
              key={result.id}
              result={result}
              platform={selectedPlatform}
              onUpdate={updateResultImageUrl}
            />
          ))}
        </div>
      </div>
    ),
    [loading, results, selectedPlatform, updateResultImageUrl],
  );

  return (
    <div className="min-h-screen bg-gray-900 font-inter p-4 pb-24 sm:p-8 lg:pb-12">
      <header className="mb-8 text-center">
        <h1 className="flex items-center justify-center text-4xl font-extrabold text-white">
          <Zap size={32} className="mr-3 text-purple-400" />
          SocialCopy AI
          <span className="ml-3 text-lg font-light text-gray-500">(MVP)</span>
        </h1>
        <p className="mt-2 text-gray-400">
          将长篇内容一键转换为 3 条针对不同平台优化的社交文案，并附带英文配图提示与一键图像生成。
        </p>
      </header>
      <main className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[minmax(0,380px)_1fr] xl:grid-cols-[minmax(0,420px)_1fr]">
        {InputConfigPanel}
        {OutputPanel}
      </main>
      <MobileGenerateBar
        disabled={!isInputValid || loading}
        loading={loading}
        onGenerate={handleGenerate}
      />
    </div>
  );
}
