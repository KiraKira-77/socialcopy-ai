"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  BookmarkCheck,
  Clipboard,
  Download,
  Image as ImageIcon,
  Laugh,
  Loader,
  Meh,
  Monitor,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

type UiLanguage = "zh-CN" | "en-US";

type Platform = {
  id: string;
  name: string;
  limit: number;
  icon: typeof Users;
  prompt: string;
  color: string;
};

type Tone = {
  id: string;
  name: string;
  icon: typeof Users;
  prompt: string;
};

type Option = {
  id: string;
  labels: Record<UiLanguage, string>;
  prompt: string;
};

type GeneratedCopy = {
  id: number;
  text: string;
  image_prompt: string;
  language: string;
  contentMode: string;
  imageUrl?: string | null;
  imageVariants: { id: string; url: string; aspectRatio: string }[];
  score: {
    readability: number;
    engagement: number;
    cta: number;
    notes: string[];
  };
};

type Draft = {
  id: string;
  name: string;
  createdAt: number;
  inputContent: string;
  platformId: string;
  toneId: string;
  languageId: string;
  contentModeId: string;
  promptOverrides: Record<string, string>;
};

type PromptTemplate = {
  id: string;
  name: string;
  values: Record<string, string>;
};

const MAX_CHARS = 5000;
const UI_LANGUAGE_STORAGE_KEY = "socialcopy_ui_language";
const PROMPT_TEMPLATE_STORAGE_KEY = "socialcopy_prompt_templates";
const DRAFTS_STORAGE_KEY = "socialcopy_drafts";

const PLATFORMS: Platform[] = [
  {
    id: "twitter",
    name: "X / Twitter",
    limit: 280,
    icon: Users,
    prompt:
      "目标是 X/Twitter，文案应简洁干练，最多三个相关 Hashtag，结尾需要 CTA。",
    color: "bg-blue-500",
  },
  {
    id: "instagram",
    name: "Instagram",
    limit: 2200,
    icon: Sparkles,
    prompt:
      "目标是 Instagram Caption，适度使用 Emoji，内容需分段并保留 CTA。",
    color: "bg-pink-500",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    limit: 3000,
    icon: Monitor,
    prompt:
      "目标是 LinkedIn 帖子，强调专业、包含 3-5 个要点及可执行建议。",
    color: "bg-sky-600",
  },
  {
    id: "xiaohongshu",
    name: "小红书",
    limit: 1000,
    icon: BookOpen,
    prompt:
      "目标是小红书图文，语气亲切，使用标题与分段，并附上推荐 Hashtag。",
    color: "bg-red-500",
  },
];

const TONES: Tone[] = [
  {
    id: "friendly",
    name: "Friendly",
    icon: Laugh,
    prompt: "语气友好、积极、贴近生活，适度加入 Emoji。",
  },
  {
    id: "professional",
    name: "Professional",
    icon: Monitor,
    prompt: "语气专业严谨，突出可信度和清晰结构。",
  },
  {
    id: "bold",
    name: "Bold",
    icon: Zap,
    prompt: "语气大胆直接，强调对读者的行动号召。",
  },
];

const OUTPUT_LANGUAGES: Option[] = [
  {
    id: "zh-CN",
    labels: { "zh-CN": "简体中文", "en-US": "Simplified Chinese" },
    prompt: "输出语言为简体中文。",
  },
  {
    id: "en-US",
    labels: { "zh-CN": "英语", "en-US": "English" },
    prompt: "Output copy in English.",
  },
];

const CONTENT_MODES: Option[] = [
  {
    id: "social",
    labels: { "zh-CN": "社交文案", "en-US": "Social Copy" },
    prompt: "输出为简洁、有吸引力的社交媒体贴文。",
  },
  {
    id: "summary",
    labels: { "zh-CN": "内容摘要", "en-US": "Summary" },
    prompt: "输出为 3-4 句的结构化内容摘要。",
  },
  {
    id: "script",
    labels: { "zh-CN": "短视频脚本", "en-US": "Short Video Script" },
    prompt: "输出为短视频脚本，包含镜头或动作提示。",
  },
];

const UI_LANGUAGE_OPTIONS: { id: UiLanguage; label: string }[] = [
  { id: "zh-CN", label: "中文" },
  { id: "en-US", label: "English" },
];

const createUiText = (language: UiLanguage) => {
  const isEnglish = language === "en-US";

  return {
    heroDescription: isEnglish
      ? "Turn long-form copy into multilingual posts, quality scores, and Imagen-ready prompts."
      : "将长文案一键转换为社交媒体内容、质量分与 Imagen 配图提示。",
    uiLanguageLabel: isEnglish ? "UI language" : "界面语言",
    promptSettingsButton: isEnglish ? "Prompt workspace" : "平台 Prompt 设置",
    draftsButton: isEnglish ? "Draft workflow" : "草稿工作流",
    steps: {
      input: isEnglish ? "1. Provide source content" : "1. 输入原始内容",
      config: isEnglish ? "2. Configure targets" : "2. 配置目标平台",
      results: (platformName: string) =>
        isEnglish
          ? `3. AI output (${platformName} style)`
          : `3. AI 生成结果 (${platformName} 风格)`,
    },
    inputPlaceholder: isEnglish
      ? "Paste the long-form copy you want to optimize (limit 5000 characters)..."
      : "粘贴需要优化的长文案（上限 5000 字符）...",
    charCountLabel: (count: number, max: number) =>
      isEnglish ? `Characters: ${count} / ${max}` : `字数：${count} / ${max}`,
    clearInput: isEnglish ? "Clear" : "清空",
    labels: {
      platform: isEnglish ? "Target platform" : "目标平台",
      tone: isEnglish ? "Tone & style" : "文案语气",
      outputLanguage: isEnglish ? "Output language" : "输出语言",
      contentMode: isEnglish ? "Content mode" : "输出形态",
    },
    generateButton: {
      idle: isEnglish ? "Generate copy & prompts" : "生成文案与配图提示",
      loading: isEnglish
        ? "AI is generating copy & image prompts..."
        : "AI 正在生成文案与配图提示...",
    },
    outputPanel: {
      loading: isEnglish
        ? "Generating three variations plus image prompts..."
        : "正在生成 3 个不同版本和配图提示...",
      empty: isEnglish
        ? "Enter content on the left and configure your targets to begin."
        : "请在左侧输入内容并配置目标平台后开始生成。",
    },
    hydrationMessage: isEnglish
      ? "Loading interface, please wait..."
      : "正在加载界面，请稍候...",
    platformLimitLabel: (limit: number) =>
      isEnglish ? `Character limit ${limit}` : `字符限制 ${limit}`,
    promptSettings: {
      title: isEnglish ? "Prompt workspace" : "平台 Prompt 设置",
      description: isEnglish
        ? "Customize per-platform prompt overrides for Gemini."
        : "为每个平台自定义提示词覆盖 Gemini 默认策略。",
      namePlaceholder: isEnglish ? "Template name" : "模板名称",
      saveButton: isEnglish ? "Save template" : "保存模板",
      savedLabel: isEnglish ? "Saved templates" : "已保存模板",
      applyButton: isEnglish ? "Apply" : "应用",
      deleteButton: isEnglish ? "Delete" : "删除",
      limitLabel: (limit: number) =>
        isEnglish ? `Character limit ${limit}` : `字符限制 ${limit}`,
      closeAria: isEnglish ? "Close prompt settings" : "关闭 Prompt 设置",
    },
    drafts: {
      title: isEnglish ? "Draft workflow" : "草稿工作流",
      description: isEnglish
        ? "Save your current input + configuration for later reuse."
        : "保存当前输入和配置，稍后快速恢复继续创作。",
      namePlaceholder: isEnglish
        ? "Draft name (e.g., Dec product launch)"
        : "草稿名称（例如：12月产品发布）",
      saveButton: isEnglish ? "Save draft" : "保存草稿",
      emptyState: isEnglish
        ? "No drafts yet. Save one to manage it here."
        : "暂无草稿，保存后可在此管理。",
      chips: {
        platform: isEnglish ? "Platform" : "平台",
        tone: isEnglish ? "Tone" : "语气",
        language: isEnglish ? "Language" : "语言",
        mode: isEnglish ? "Mode" : "形态",
      },
      emptyInput: isEnglish ? "(Empty input)" : "（空白输入）",
      applyButton: isEnglish ? "Apply draft" : "应用草稿",
      deleteButton: isEnglish ? "Delete" : "删除",
      closeAria: isEnglish ? "Close drafts panel" : "关闭草稿面板",
    },
    resultCard: {
      copyIdle: isEnglish ? "Copy copy" : "复制文案",
      copySuccess: isEnglish ? "Copy copied" : "文案已复制",
      promptIdle: isEnglish ? "Copy image prompt" : "复制配图提示",
      promptSuccess: isEnglish ? "Prompt copied" : "配图提示已复制",
      imageSection: isEnglish ? "Generate AI images" : "生成 AI 配图",
      imageLoading: isEnglish
        ? "Generating image... this may take up to 30s."
        : "正在生成配图，可能需要 30 秒。",
      imageError: isEnglish
        ? "Image generation failed, please retry."
        : "配图生成失败，请重试。",
      ratioLabel: (ratio: string) =>
        isEnglish ? `Aspect ratio: ${ratio}` : `比例：${ratio}`,
      download: isEnglish ? "Download" : "下载",
      copyLink: isEnglish ? "Copy link" : "复制链接",
      regenerate: isEnglish ? "Regenerate" : "重新生成",
      modeLabel: isEnglish ? "Mode" : "输出形态",
      languageLabel: isEnglish ? "Language" : "语言",
      scores: {
        readability: isEnglish ? "Readability" : "可读性",
        engagement: isEnglish ? "Engagement" : "互动性",
        cta: "CTA",
      },
    },
    notes: {
      missingHashtag: isEnglish
        ? "Add 1-3 relevant hashtags to boost discovery."
        : "缺少 Hashtag，可添加 1-3 个相关词。",
      tooManyHashtags: isEnglish
        ? "Too many hashtags may hurt readability."
        : "Hashtag 较多，可能影响可读性。",
      missingQuestion: isEnglish
        ? "Ask a question to invite engagement."
        : "尝试提出一个问题以引导互动。",
      missingCTA: isEnglish
        ? "Add a clear call-to-action."
        : "缺少 CTA，建议加入行动号召。",
      suggestEmoji: isEnglish
        ? "This tone benefits from emojis—add 1-2 expressive ones."
        : "当前语气适合 Emoji，可添加 1-2 个表情。",
      greatStructure: isEnglish
        ? "Structure looks solid—ready to publish."
        : "整体结构良好，可直接发布。",
      generationFailed: isEnglish
        ? "Unable to evaluate until generation succeeds."
        : "生成失败，暂无法评估。",
    },
  };
};

const evaluateCopy = (text: string, platform: Platform, tone: Tone) => {
  const notes: string[] = [];
  let readability = Math.min(95, Math.max(40, 100 - text.length / 80));

  const hashtagMatches = text.match(/#[^\s#]+/g)?.length ?? 0;
  let engagement = 70;
  if (hashtagMatches === 0) {
    engagement -= 10;
    notes.push("missingHashtag");
  } else if (hashtagMatches > 5) {
    engagement -= 5;
    notes.push("tooManyHashtags");
  }

  if (!/[？?]/.test(text)) {
    engagement -= 5;
    notes.push("missingQuestion");
  }

  engagement = Math.max(40, Math.min(90, engagement));

  let cta = 70;
  if (!/(点击|立即|马上|sign up|buy now|learn more|了解更多)/i.test(text)) {
    notes.push("missingCTA");
  } else {
    cta += 10;
  }

  if (tone.id === "friendly" && !/[😀-🙏]/u.test(text)) {
    notes.push("suggestEmoji");
  }

  if (notes.length === 0) {
    notes.push("greatStructure");
  }

  if (text.length > platform.limit) {
    readability = Math.max(30, readability - 15);
  }

  return {
    readability: Math.round(readability),
    engagement: Math.round(engagement),
    cta: Math.round(Math.min(95, cta)),
    notes,
  };
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const ResultCard = ({
  result,
  platform,
  uiText,
  contentModeLabel,
  outputLanguageLabel,
  onGenerateImage,
}: {
  result: GeneratedCopy;
  platform: Platform;
  uiText: ReturnType<typeof createUiText>;
  contentModeLabel: (id: string) => string;
  outputLanguageLabel: (id: string) => string;
  onGenerateImage: (
    resultId: number,
    prompt: string,
    aspectRatio: "1:1" | "16:9" | "9:16",
  ) => Promise<void>;
}) => {
  const [copyState, setCopyState] = useState<"idle" | "success">("idle");
  const [promptState, setPromptState] = useState<"idle" | "success">("idle");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleCopy = async () => {
    const success = await copyToClipboard(result.text);
    setCopyState(success ? "success" : "idle");
    setTimeout(() => setCopyState("idle"), 2000);
  };

  const handleCopyPrompt = async () => {
    const success = await copyToClipboard(result.image_prompt);
    setPromptState(success ? "success" : "idle");
    setTimeout(() => setPromptState("idle"), 2000);
  };

  const handleGenerateImage = async (ratio: "1:1" | "16:9" | "9:16") => {
    setImageLoading(true);
    setImageError(null);
    try {
      await onGenerateImage(result.id, result.image_prompt, ratio);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : uiText.resultCard.imageError;
      setImageError(message);
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-5 space-y-4 shadow-lg shadow-black/30">
      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-gray-400">
        <span className="rounded-full border border-gray-600 px-3 py-1">
          {uiText.resultCard.languageLabel}:{" "}
          {outputLanguageLabel(result.language)}
        </span>
        <span className="rounded-full border border-gray-600 px-3 py-1">
          {uiText.resultCard.modeLabel}: {contentModeLabel(result.contentMode)}
        </span>
        <span className="rounded-full border border-gray-600 px-3 py-1">
          {uiText.platformLimitLabel(platform.limit)}
        </span>
      </div>

      <p className="text-gray-100 whitespace-pre-line leading-relaxed">
        {result.text}
      </p>

      <div className="grid grid-cols-3 gap-4">
        {([
          {
            label: uiText.resultCard.scores.readability,
            value: result.score.readability,
          },
          {
            label: uiText.resultCard.scores.engagement,
            value: result.score.engagement,
          },
          { label: uiText.resultCard.scores.cta, value: result.score.cta },
        ] as const).map((score) => (
          <div
            key={score.label}
            className="rounded-xl bg-gray-900/60 p-3 text-center"
          >
            <p className="text-xs uppercase text-gray-400">{score.label}</p>
            <p className="text-2xl font-bold text-purple-300">
              {score.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-sm text-purple-200">
        {result.score.notes.map((note) => (
          <span
            key={note}
            className="rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1"
          >
            {uiText.notes[note as keyof typeof uiText.notes] ??
              uiText.notes.greatStructure}
          </span>
        ))}
      </div>

      <div className="space-y-2 rounded-xl border border-gray-700 bg-gray-900/40 p-4">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <ImageIcon size={16} className="text-purple-400" />
          Image prompt (EN)
        </p>
        <p className="text-sm text-gray-200 whitespace-pre-line">
          {result.image_prompt}
        </p>
        <button
          type="button"
          onClick={handleCopyPrompt}
          className="inline-flex items-center gap-2 rounded-lg border border-purple-500/60 px-3 py-2 text-sm font-semibold text-purple-200 transition hover:bg-purple-500/10"
        >
          <Clipboard size={14} />
          {promptState === "success"
            ? uiText.resultCard.promptSuccess
            : uiText.resultCard.promptIdle}
        </button>
      </div>

      <div className="space-y-3 rounded-xl border border-gray-700 bg-gray-900/40 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <ImageIcon size={16} className="text-teal-300" />
            {uiText.resultCard.imageSection}
          </p>
          {imageLoading && (
            <span className="text-xs text-gray-400">
              {uiText.resultCard.imageLoading}
            </span>
          )}
        </div>
        {imageError && (
          <p className="text-sm text-red-400">{imageError}</p>
        )}
        <div className="grid grid-cols-3 gap-2">
          {(["1:1", "16:9", "9:16"] as const).map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => handleGenerateImage(ratio)}
              disabled={imageLoading}
              className="rounded-lg bg-teal-600/80 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
            >
              {ratio}
            </button>
          ))}
        </div>
        {result.imageUrl && (
          <div className="rounded-xl border border-gray-700 bg-black/30 p-3 space-y-2">
            <img
              src={result.imageUrl}
              alt="AI generated"
              className="w-full rounded-lg object-cover"
            />
            <div className="flex gap-2">
              <a
                href={result.imageUrl}
                download={`socialcopy-${result.id}.png`}
                className="flex-1 rounded-lg bg-gray-700 px-3 py-2 text-center text-sm text-white hover:bg-gray-600"
              >
                {uiText.resultCard.download}
              </a>
              <button
                type="button"
                onClick={() => copyToClipboard(result.imageUrl ?? "")}
                className="flex-1 rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
              >
                {uiText.resultCard.copyLink}
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className={`w-full rounded-xl py-3 font-semibold transition ${
          copyState === "success"
            ? "bg-green-600 text-white"
            : "bg-purple-600 text-white hover:bg-purple-500"
        }`}
      >
        {copyState === "success"
          ? uiText.resultCard.copySuccess
          : uiText.resultCard.copyIdle}
      </button>
    </div>
  );
};

const PlatformCard = ({
  platform,
  isSelected,
  onSelect,
  label,
}: {
  platform: Platform;
  isSelected: boolean;
  onSelect: (platform: Platform) => void;
  label: string;
}) => (
  <button
    type="button"
    onClick={() => onSelect(platform)}
    className={`flex flex-col items-start rounded-xl border p-4 text-left transition ${
      isSelected
        ? "border-purple-400 bg-purple-500/10 text-white"
        : "border-gray-700 bg-gray-900/40 text-gray-200 hover:border-purple-400"
    }`}
  >
    <div className="flex items-center gap-2">
      <platform.icon
        size={16}
        className={`${isSelected ? "text-purple-300" : "text-gray-400"}`}
      />
      <p className="text-sm font-semibold">{platform.name}</p>
    </div>
    <p className="mt-2 text-xs text-gray-400">{label}</p>
  </button>
);


export default function Home() {
  const [inputContent, setInputContent] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(
    PLATFORMS[0],
  );
  const [selectedTone, setSelectedTone] = useState<Tone>(TONES[0]);
  const [selectedLanguage, setSelectedLanguage] =
    useState<Option>(OUTPUT_LANGUAGES[0]);
  const [selectedContentMode, setSelectedContentMode] =
    useState<Option>(CONTENT_MODES[0]);
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>("zh-CN");
  const uiText = useMemo(() => createUiText(uiLanguage), [uiLanguage]);
  const [results, setResults] = useState<GeneratedCopy[]>([]);
  const [loading, setLoading] = useState(false);
  const [promptOverrides, setPromptOverrides] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      PLATFORMS.forEach((platform) => {
        initial[platform.id] = platform.prompt;
      });
      return initial;
    },
  );
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftName, setDraftName] = useState("");
  const [isPromptSettingsOpen, setPromptSettingsOpen] = useState(false);
  const [isDraftsOpen, setDraftsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedUiLanguage = window.localStorage.getItem(
      UI_LANGUAGE_STORAGE_KEY,
    ) as UiLanguage | null;
    if (storedUiLanguage === "zh-CN" || storedUiLanguage === "en-US") {
      setUiLanguage(storedUiLanguage);
    }
    const storedTemplates = window.localStorage.getItem(
      PROMPT_TEMPLATE_STORAGE_KEY,
    );
    if (storedTemplates) {
      try {
        const parsed = JSON.parse(storedTemplates) as PromptTemplate[];
        setPromptTemplates(parsed);
        if (parsed[0]?.values) {
          setPromptOverrides(parsed[0].values);
        }
      } catch {
        // ignore corrupted cache
      }
    }
    const storedDrafts = window.localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (storedDrafts) {
      try {
        setDrafts(JSON.parse(storedDrafts) as Draft[]);
      } catch {
        // ignore corrupted cache
      }
    }
  }, []);

  const persistTemplates = useCallback(
    (items: PromptTemplate[]) => {
      setPromptTemplates(items);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          PROMPT_TEMPLATE_STORAGE_KEY,
          JSON.stringify(items),
        );
      }
    },
    [],
  );

  const persistDrafts = useCallback((items: Draft[]) => {
    setDrafts(items);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(items));
    }
  }, []);

  const handleUiLanguageChange = useCallback((value: UiLanguage) => {
    setUiLanguage(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, value);
    }
  }, []);

  const charCount = inputContent.length;
  const isInputValid = charCount > 0 && charCount <= MAX_CHARS;

  const getOutputLanguageLabel = useCallback(
    (languageId: string) =>
      OUTPUT_LANGUAGES.find((item) => item.id === languageId)?.labels[
        uiLanguage
      ] ?? languageId,
    [uiLanguage],
  );

  const getContentModeLabel = useCallback(
    (modeId: string) =>
      CONTENT_MODES.find((item) => item.id === modeId)?.labels[uiLanguage] ??
      modeId,
    [uiLanguage],
  );
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleGenerateCopy = useCallback(async () => {
    if (!isInputValid || loading) {
      return;
    }
    setLoading(true);
    setGenerationError(null);
    try {
      const response = await fetch("/api/ai/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: inputContent,
          platform: {
            ...selectedPlatform,
            prompt: promptOverrides[selectedPlatform.id] ?? selectedPlatform.prompt,
          },
          tone: selectedTone,
          language: selectedLanguage,
          contentMode: selectedContentMode,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate copy");
      }

      const data = (await response.json()) as {
        items: {
          text: string;
          image_prompt: string;
          language: string;
          content_mode: string;
        }[];
      };

      const now = Date.now();
      const nextResults = data.items.map((item, index) => ({
        id: now + index,
        text: item.text,
        image_prompt: item.image_prompt,
        language: item.language,
        contentMode: item.content_mode,
        imageUrl: null,
        imageVariants: [],
        score: evaluateCopy(item.text, selectedPlatform, selectedTone),
      }));
      setResults(nextResults);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to generate copy";
      setGenerationError(message);
    } finally {
      setLoading(false);
    }
  }, [
    inputContent,
    isInputValid,
    loading,
    promptOverrides,
    selectedContentMode,
    selectedLanguage,
    selectedPlatform,
    selectedTone,
  ]);

  const handleGenerateImage = useCallback(
    async (
      resultId: number,
      prompt: string,
      aspectRatio: "1:1" | "16:9" | "9:16",
    ) => {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspectRatio }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate image");
      }

      const data = (await response.json()) as { imageUrl: string };
      setResults((prev) =>
        prev.map((item) =>
          item.id === resultId
            ? {
                ...item,
                imageUrl: data.imageUrl,
                imageVariants: [
                  ...item.imageVariants.filter(
                    (variant) => variant.aspectRatio !== aspectRatio,
                  ),
                  {
                    id: `${resultId}-${aspectRatio}`,
                    url: data.imageUrl,
                    aspectRatio,
                  },
                ],
              }
            : item,
        ),
      );
    },
    [],
  );

  const handlePromptOverrideChange = useCallback(
    (platformId: string, value: string) => {
      setPromptOverrides((prev) => ({ ...prev, [platformId]: value }));
    },
    [],
  );

  const handleSaveTemplate = useCallback(() => {
    const trimmedName = templateName.trim();
    if (!trimmedName) {
      return;
    }
    const newTemplate: PromptTemplate = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      name: trimmedName,
      values: { ...promptOverrides },
    };
    persistTemplates([newTemplate, ...promptTemplates]);
    setTemplateName("");
  }, [persistTemplates, promptOverrides, promptTemplates, templateName]);

  const handleApplyTemplate = useCallback((template: PromptTemplate) => {
    setPromptOverrides({ ...template.values });
  }, []);

  const handleDeleteTemplate = useCallback(
    (templateId: string) => {
      const nextTemplates = promptTemplates.filter(
        (template) => template.id !== templateId,
      );
      persistTemplates(nextTemplates);
    },
    [persistTemplates, promptTemplates],
  );

  const handleSaveDraft = useCallback(() => {
    const trimmedDraftName = draftName.trim();
    if (!trimmedDraftName) {
      return;
    }
    const newDraft: Draft = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      name: trimmedDraftName,
      createdAt: Date.now(),
      inputContent,
      platformId: selectedPlatform.id,
      toneId: selectedTone.id,
      languageId: selectedLanguage.id,
      contentModeId: selectedContentMode.id,
      promptOverrides: { ...promptOverrides },
    };
    persistDrafts([newDraft, ...drafts]);
    setDraftName("");
  }, [
    draftName,
    drafts,
    inputContent,
    persistDrafts,
    promptOverrides,
    selectedContentMode.id,
    selectedLanguage.id,
    selectedPlatform.id,
    selectedTone.id,
  ]);

  const handleApplyDraft = useCallback((draft: Draft) => {
    const platform = PLATFORMS.find((item) => item.id === draft.platformId);
    const tone = TONES.find((item) => item.id === draft.toneId);
    const language = OUTPUT_LANGUAGES.find(
      (item) => item.id === draft.languageId,
    );
    const contentMode = CONTENT_MODES.find(
      (item) => item.id === draft.contentModeId,
    );
    if (platform) {
      setSelectedPlatform(platform);
    }
    if (tone) {
      setSelectedTone(tone);
    }
    if (language) {
      setSelectedLanguage(language);
    }
    if (contentMode) {
      setSelectedContentMode(contentMode);
    }
    setPromptOverrides({ ...draft.promptOverrides });
    setInputContent(draft.inputContent);
  }, []);

  const handleDeleteDraft = useCallback(
    (draftId: string) => {
      const nextDrafts = drafts.filter((item) => item.id !== draftId);
      persistDrafts(nextDrafts);
    },
    [drafts, persistDrafts],
  );

  const currentPlatformPrompt =
    promptOverrides[selectedPlatform.id] ?? selectedPlatform.prompt;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 lg:flex-row lg:px-8">
        <section className="space-y-6 lg:w-1/2">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-widest text-gray-400">
              SocialCopy AI
            </p>
            <p className="text-3xl font-semibold text-white">
              {uiText.heroDescription}
            </p>
            <div>
              <p className="text-sm text-gray-400">{uiText.uiLanguageLabel}</p>
              <div className="mt-2 inline-flex gap-2 rounded-full border border-gray-700 bg-gray-900/40 p-1">
                {UI_LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleUiLanguageChange(option.id)}
                    className={`rounded-full px-3 py-1 text-sm transition ${
                      uiLanguage === option.id
                        ? "bg-purple-600 text-white"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-x-3">
            <button
              type="button"
              onClick={() => setPromptSettingsOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200 transition hover:bg-purple-500/20"
            >
              <Settings size={14} />
              {uiText.promptSettingsButton}
            </button>
            <button
              type="button"
              onClick={() => setDraftsOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/20"
            >
              <BookmarkCheck size={14} />
              {uiText.draftsButton}
            </button>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-800 bg-gray-900/40 p-5 shadow-inner shadow-black/20">
            <p className="text-sm font-semibold tracking-wide text-gray-300">
              {uiText.steps.input}
            </p>
            <textarea
              value={inputContent}
              onChange={(event) => setInputContent(event.target.value)}
              placeholder={uiText.inputPlaceholder}
              className="min-h-[220px] w-full rounded-2xl border border-gray-700 bg-black/30 p-4 text-sm text-gray-100 placeholder:text-gray-500 focus:border-purple-500 focus:outline-none"
            />
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{uiText.charCountLabel(charCount, MAX_CHARS)}</span>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => setInputContent("")}
                  className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:border-gray-500"
                >
                  {uiText.clearInput}
                </button>
                <span className={isInputValid ? "text-teal-300" : "text-red-400"}>
                  {isInputValid ? "Ready" : "Check input"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
            <p className="text-sm font-semibold tracking-wide text-gray-300">
              {uiText.steps.config}
            </p>

            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400">
                {uiText.labels.platform}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {PLATFORMS.map((platform) => (
                  <PlatformCard
                    key={platform.id}
                    platform={platform}
                    isSelected={selectedPlatform.id === platform.id}
                    onSelect={setSelectedPlatform}
                    label={uiText.platformLimitLabel(platform.limit)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400">
                {uiText.labels.tone}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {TONES.map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setSelectedTone(tone)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                      selectedTone.id === tone.id
                        ? "border-emerald-400 bg-emerald-500/10 text-white"
                        : "border-gray-700 text-gray-300 hover:border-emerald-400"
                    }`}
                  >
                    <tone.icon size={16} />
                    <span>{tone.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400">
                  {uiText.labels.outputLanguage}
                </p>
                <div className="mt-3 space-y-2">
                  {OUTPUT_LANGUAGES.map((language) => (
                    <button
                      key={language.id}
                      type="button"
                      onClick={() => setSelectedLanguage(language)}
                      className={`w-full rounded-xl border px-3 py-2 text-sm transition ${
                        selectedLanguage.id === language.id
                          ? "border-blue-400 bg-blue-500/10 text-white"
                          : "border-gray-700 text-gray-300 hover:border-blue-400"
                      }`}
                    >
                      {language.labels[uiLanguage]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400">
                  {uiText.labels.contentMode}
                </p>
                <div className="mt-3 space-y-2">
                  {CONTENT_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSelectedContentMode(mode)}
                      className={`w-full rounded-xl border px-3 py-2 text-sm transition ${
                        selectedContentMode.id === mode.id
                          ? "border-purple-400 bg-purple-500/10 text-white"
                          : "border-gray-700 text-gray-300 hover:border-purple-400"
                      }`}
                    >
                      {mode.labels[uiLanguage]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-600/40 bg-purple-950/40 p-5">
            <p className="text-sm text-purple-200">
              {selectedPlatform.name}: {currentPlatformPrompt.slice(0, 120)}
              {currentPlatformPrompt.length > 120 ? "��" : ""}
            </p>
            <button
              type="button"
              disabled={!isInputValid || loading}
              onClick={handleGenerateCopy}
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-purple-500 bg-purple-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50`}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  {uiText.generateButton.loading}
                </>
              ) : (
                <>
                  <Send size={16} />
                  {uiText.generateButton.idle}
                </>
              )}
            </button>
            {generationError && (
              <p className="mt-3 text-sm text-red-400">{generationError}</p>
            )}
          </div>
        </section>

        <section className="space-y-4 lg:w-1/2">
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
            <p className="text-sm font-semibold tracking-wide text-gray-300">
              {uiText.steps.results(selectedPlatform.name)}
            </p>
            <div className="mt-4 space-y-4">
              {loading && (
                <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-black/30 px-4 py-3 text-sm text-gray-400">
                  <Loader className="animate-spin text-purple-300" size={16} />
                  {uiText.outputPanel.loading}
                </div>
              )}
              {!loading && results.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-700 bg-black/20 px-4 py-8 text-center text-sm text-gray-500">
                  {uiText.outputPanel.empty}
                </div>
              )}
              {!loading &&
                results.map((result) => (
                  <ResultCard
                    key={result.id}
                    result={result}
                    platform={selectedPlatform}
                    uiText={uiText}
                    contentModeLabel={getContentModeLabel}
                    outputLanguageLabel={getOutputLanguageLabel}
                    onGenerateImage={handleGenerateImage}
                  />
                ))}
            </div>
          </div>
        </section>
      </div>

      {isPromptSettingsOpen && (
        <div className="fixed inset-0 z-20 bg-black/70 p-4 backdrop-blur">
          <div className="mx-auto max-w-4xl overflow-y-auto rounded-3xl border border-gray-800 bg-gray-950 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-white">
                  {uiText.promptSettings.title}
                </p>
                <p className="text-sm text-gray-400">
                  {uiText.promptSettings.description}
                </p>
              </div>
              <button
                type="button"
                aria-label={uiText.promptSettings.closeAria}
                onClick={() => setPromptSettingsOpen(false)}
                className="rounded-full border border-gray-700 px-3 py-1 text-sm text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {PLATFORMS.map((platform) => (
                <div
                  key={platform.id}
                  className="rounded-2xl border border-gray-800 bg-gray-900/30 p-4"
                >
                  <div className="flex items-center justify-between text-sm text-gray-300">
                    <span>{platform.name}</span>
                    <span>
                      {uiText.promptSettings.limitLabel(platform.limit)}
                    </span>
                  </div>
                  <textarea
                    value={promptOverrides[platform.id] ?? platform.prompt}
                    onChange={(event) =>
                      handlePromptOverrideChange(platform.id, event.target.value)
                    }
                    className="mt-3 min-h-[120px] w-full rounded-xl border border-gray-700 bg-black/40 p-3 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder={uiText.promptSettings.namePlaceholder}
                  className="flex-1 rounded-xl border border-gray-700 bg-black/30 p-3 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim()}
                  className="rounded-xl border border-purple-500 bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
                >
                  {uiText.promptSettings.saveButton}
                </button>
              </div>
              {promptTemplates.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs uppercase tracking-widest text-gray-400">
                    {uiText.promptSettings.savedLabel}
                  </p>
                  {promptTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between rounded-xl border border-gray-800 bg-black/20 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-white">{template.name}</p>
                        <p className="text-xs text-gray-500">
                          {Object.keys(template.values).length} overrides
                        </p>
                      </div>
                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={() => handleApplyTemplate(template)}
                          className="rounded-lg border border-purple-400 px-3 py-1 text-xs text-purple-200 hover:bg-purple-500/10"
                        >
                          {uiText.promptSettings.applyButton}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="rounded-lg border border-gray-600 px-3 py-1 text-xs text-gray-300 hover:border-red-400 hover:text-red-300"
                        >
                          {uiText.promptSettings.deleteButton}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isDraftsOpen && (
        <div className="fixed inset-0 z-20 bg-black/70 p-4 backdrop-blur">
          <div className="mx-auto max-w-3xl overflow-y-auto rounded-3xl border border-gray-800 bg-gray-950 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-white">
                  {uiText.drafts.title}
                </p>
                <p className="text-sm text-gray-400">
                  {uiText.drafts.description}
                </p>
              </div>
              <button
                type="button"
                aria-label={uiText.drafts.closeAria}
                onClick={() => setDraftsOpen(false)}
                className="rounded-full border border-gray-700 px-3 py-1 text-sm text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder={uiText.drafts.namePlaceholder}
                className="flex-1 rounded-xl border border-gray-700 bg-black/30 p-3 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={!draftName.trim()}
                className="rounded-xl border border-blue-500 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {uiText.drafts.saveButton}
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {drafts.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-700 bg-black/20 px-4 py-4 text-center text-sm text-gray-500">
                  {uiText.drafts.emptyState}
                </p>
              )}
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="space-y-3 rounded-2xl border border-gray-800 bg-gray-900/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {draft.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(draft.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="space-x-2 text-xs text-gray-400">
                      <span className="rounded-full border border-gray-700 px-2 py-1">
                        {uiText.drafts.chips.platform}: {draft.platformId}
                      </span>
                      <span className="rounded-full border border-gray-700 px-2 py-1">
                        {uiText.drafts.chips.tone}: {draft.toneId}
                      </span>
                      <span className="rounded-full border border-gray-700 px-2 py-1">
                        {uiText.drafts.chips.language}: {draft.languageId}
                      </span>
                      <span className="rounded-full border border-gray-700 px-2 py-1">
                        {uiText.drafts.chips.mode}: {draft.contentModeId}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300">
                    {draft.inputContent || uiText.drafts.emptyInput}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleApplyDraft(draft)}
                      className="flex-1 rounded-xl border border-blue-400 px-3 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/10"
                    >
                      {uiText.drafts.applyButton}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="rounded-xl border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:border-red-400 hover:text-red-300"
                    >
                      {uiText.drafts.deleteButton}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
