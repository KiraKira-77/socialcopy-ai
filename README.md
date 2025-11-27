# SocialCopy AI on Next.js + Deno / 社交文案 AI（Next.js + Deno）

## Overview / 项目概述
- **EN**: SocialCopy AI is a Next.js App Router experience tuned for Deno Deploy and powered by Google Gemini 2.5 plus Imagen 4.0. It ingests long-form copy, then returns multilingual, platform-aware snippets, quality scores, reusable prompt templates, and AI-generated visuals.

- **中文**: SocialCopy AI 基于 Next.js App Router 构建，优化部署在 Deno Deploy，并接入 Google Gemini 2.5 与 Imagen 4.0。输入任意长文案即可获得多语言、多平台的成品文案、质量评分、可复用的 Prompt 模板以及 AI 配图。

## Feature Highlights / 核心功能
- **Multilingual & multi-mode output**  
  - **EN**: Toggle between Simplified Chinese and English plus Social Copy, Summary, or Short-Video Script modes.  
  - **中文**: 支持中英文切换，并可在社交文案、总结、短视频脚本等多种形态间切换。

- **Prompt control center**  
  - **EN**: Edit per-platform prompts, save/apply templates, and persist them in `localStorage`.  
  - **中文**: 为不同平台定制 Prompt，保存模板并即时应用，数据全部保存在 `localStorage`。

- **Quality scoring**  
  - **EN**: Every result carries readability, engagement, and CTA scores with suggestions.  
  - **中文**: 每条结果附带可读性、互动性、CTA 评分与改进建议。

- **Imagen-powered image workflow**  
  - **EN**: Create English prompts, call Imagen 4.0 for 1:1 / 16:9 / 9:16 variants, preview, download PNG, or copy Base64.  
  - **中文**: 自动生成英文描述，调用 Imagen 4.0 输出 1:1、16:9、9:16 多图，支持预览、下载 PNG 或复制 Base64。

- **Draft management**  
  - **EN**: Save platform, tone, language, mode, and prompt overrides via the “草稿工作流” drawer to resume later.  
  - **中文**: “草稿工作流” 抽屉可保存输入全文、平台、语气、语言、形态及 Prompt 覆盖信息，随时恢复。

## Prerequisites / 环境要求
- **EN**: Deno 1.39+ (preferred) or Node.js 20+ for `npm` scripts; Google Generative AI key with `gemini-2.5-flash-preview-09-2025:generateContent` and `imagen-4.0-generate-001:predict` access; a Chromium-based browser for DevTools logging.  
- **中文**: 准备 Deno 1.39+（推荐）或 Node.js 20+、可调用 `gemini-2.5-flash-preview-09-2025:generateContent` 与 `imagen-4.0-generate-001:predict` 的 Google Generative AI Key，以及可查看 DevTools 日志的 Chromium 浏览器。

## Setup / 项目初始化

```bash
npm install          # install dependencies / 安装依赖
export GEMINI_API_KEY="<your-key>"   # optional env var / 可将 Key 写入环境变量
```

- **EN**: The demo keeps the API key inline for convenience; move it to env vars or a proxy before production.  
- **中文**: Demo 中为方便演示将 Key 写在代码里，上线前请改成环境变量或服务端代理。
- **EN**: Both `/api/ai/generate-copy` and `/api/ai/generate-image` read `GEMINI_API_KEY`, so make sure it is available in `.env.local`, shell exports, or your Deno Deploy project.  
- **中文**: `/api/ai/generate-copy` 与 `/api/ai/generate-image` 都依赖 `GEMINI_API_KEY`，开发/部署时请在 `.env.local`、shell 变量或 Deno Deploy 配置里提供。

## Development & Debugging / 开发与调试

```bash
npm run dev          # or deno task dev
npm run lint         # wraps next lint
npm run build        # deno task build for production
```

- **EN**: Open `http://localhost:3000`, keep DevTools visible, and watch `[Gemini]` / `[Imagen]` console logs for every request/response when tuning prompts or latency.  
- **中文**: 打开 `http://localhost:3000`，保持 DevTools 常开，关注控制台中的 `[Gemini]` / `[Imagen]` 日志以便调试 Prompt 与时延。

## Deploying on Deno Deploy / 发布到 Deno Deploy
1. **EN**: Push your fork (strip local secrets). **中文**: 将分支推送到 GitHub 并清理本地密钥。  
2. **EN**: In [Deno Deploy](https://dash.deno.com/) choose New Project → Deploy from GitHub. **中文**: 在 Deno Deploy 控制台选择 “New Project → Deploy from GitHub”。  
3. **EN**: Select this repo, set command to `deno task start`, and add env vars such as `GEMINI_API_KEY`. **中文**: 选择仓库后把启动命令设为 `deno task start`，并配置 `GEMINI_API_KEY` 等环境变量。  
4. **EN**: Trigger deployment; Deno Deploy builds the Next.js app globally. **中文**: 触发构建，Deno Deploy 将自动产出并分发生产版本。

## Contributing / 贡献指南
- **EN**: Read `AGENTS.md` for file structure, coding style, AI workflow, and PR etiquette. Run `npm run lint`, `npx jest --runInBand`, and relevant `deno test` commands before committing. Document any Prompt/Draft schema adjustments, attach screenshots or Loom demos for new flows, report `[Gemini]` / `[Imagen]` console anomalies, and ensure `deno task build` passes before requesting review.  
- **中文**: 贡献前请阅读 `AGENTS.md` 了解目录结构、编码规范与 AI 工作流；提交前务必通过 `npm run lint`、`npx jest --runInBand` 及相关 `deno test`。若修改 Prompt/Draft 结构需在 PR 中说明，并附上截图或 Loom 演示，记录 `[Gemini]` / `[Imagen]` 异常日志，且确保 `deno task build` 成功后再发起 Review。

Let’s keep SocialCopy AI delightful for contributors and creators! / 期待与你一起让 SocialCopy AI 更加出色！
