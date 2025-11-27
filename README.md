# SocialCopy AI · Next.js + Deno Deploy

> Multilingual social copy, prompt templates, and Imagen workflows built with the Next.js App Router and designed for Deno Deploy. / 基于 Next.js App Router 的社交文案 & Imagen 工作流，原生适配 Deno Deploy。

## Table of Contents / 目录
1. [Overview / 项目概述](#overview--项目概述)
2. [Feature Highlights / 核心功能](#feature-highlights--核心功能)
3. [Architecture & Prerequisites / 架构与环境](#architecture--prerequisites--架构与环境)
4. [Quick Start / 快速上手](#quick-start--快速上手)
5. [Available Scripts / 常用脚本](#available-scripts--常用脚本)
6. [API Key Management / 密钥管理](#api-key-management--密钥管理)
7. [Deploying on Deno Deploy / 发布到 Deno Deploy](#deploying-on-deno-deploy--发布到-deno-deploy)
8. [Troubleshooting / 常见问题](#troubleshooting--常见问题)
9. [Contributing / 贡献指南](#contributing--贡献指南)

## Overview / 项目概述
- **EN**: SocialCopy AI ingests long-form copy and returns multilingual, platform-aware snippets with readability/engagement/CTA scores, reusable prompt templates, and Imagen 4.0 image variants.
- **中文**: 输入任意长文案，即可生成多语言、多平台的社交内容，附带可读性/互动性/CTA 评分、Prompt 模板，以及 Imagen 4.0 的 1:1、16:9、9:16 配图。

## Feature Highlights / 核心功能
- **Multilingual + Multi-mode / 多语言多形态**  
  EN: Toggle between Simplified Chinese and English plus Social / Summary / Short-Video modes.  
  中文: 支持中英界面与文案，并可在社交贴文、摘要、短视频脚本等形态间快速切换。
- **Prompt Workspace / Prompt 工作区**  
  EN: Override prompts per platform, save templates, and persist them in `localStorage`.  
  中文: 针对不同平台自定义 Prompt，保存/应用模板，数据均保存在浏览器本地。
- **Quality Scoring / 质量评分**  
  EN: Each output carries readability, engagement, CTA scores, and targeted suggestions.  
  中文: 每条结果包含可读性、互动性、CTA 评分与改进建议。
- **Imagen Workflow / Imagen 流程**  
  EN: Generate English prompts, call Imagen 4.0 for 1:1 / 16:9 / 9:16 variants, preview, download, or copy Base64.  
  中文: 自动生成英文配图提示，调用 Imagen 4.0 输出多种比例，可预览、下载 PNG 或复制 Base64。
- **Draft Drawer / 草稿抽屉**  
  EN: Save platform, tone, language, mode, and prompt overrides to resume later.  
  中文: 草稿抽屉一次性保存平台、语气、语言、形态、Prompt，随时恢复继续编辑。

## Architecture & Prerequisites / 架构与环境
- **Stack**: Next.js App Router + React 19 + Tailwind CSS + Deno Deploy runtime.  
- **AI Providers**: Google Gemini 2.5 (`gemini-2.5-flash-preview-09-2025`) & Imagen 4.0 (`imagen-4.0-generate-001`).  
- **Storage**: Drafts, templates, and API keys persist in browser `localStorage`.  
- **Requirements / 环境要求**: Deno 1.39+（推荐）或 Node.js 20+、Chromium 浏览器，以及具备上述模型权限的 Google Generative AI Key。

## Quick Start / 快速上手
```bash
git clone https://github.com/<you>/socialcopy-ai.git
cd socialcopy-ai
npm install
npm run dev   # or deno task dev
```

- **API key**: 创建 `.env.local` 并写入 `GEMINI_API_KEY=...`，或在前端的 “Settings → API key” 页面粘贴个人密钥（仅保存在浏览器）。  
- **访问**: 打开 `http://localhost:3000` 并留意 `[Gemini]` / `[Imagen]` 控制台日志，便于调试 Prompt 与时延。

## Available Scripts / 常用脚本
| Command | 说明 / Description |
| --- | --- |
| `npm run dev` / `deno task dev` | 启动开发模式（Next.js + Fast Refresh）。 |
| `npm run lint` | 运行 `next lint`，保证 ESLint + TypeScript 规则。 |
| `npm run build` | 在 Node 环境构建生产包。 |
| `deno task build` | 通过 Deno CLI 调用 `next build`（用于 Deno Deploy）。 |
| `deno task start` / `npm run start` | 启动生产服务器。 |

## API Key Management / 密钥管理
1. **Server env**: 在 `.env.local`、Shell 或 Deno Deploy 环境变量里填入 `GEMINI_API_KEY`。  
2. **Client override**: 访问 `/settings/api-key` 粘贴密钥，保存在 `localStorage`，所有 `/api/ai/*` 请求会优先使用该 Key，留空则回退服务器变量。  
3. **安全提示**: 浏览器储存仅适用于个人 Demo，生产环境仍推荐后端代理或安全存储。

## Deploying on Deno Deploy / 发布到 Deno Deploy
1. **Install 命令**：`deno install --allow-scripts=npm:sharp,npm:unrs-resolver`（授权必要 npm 脚本）。  
2. **Build 命令**：  
   - 若已开通 *Node compatibility*：`npm run build`（耗时短且稳定）。  
   - 否则继续使用：`deno task build`。  
3. **Run 命令**：`deno task start`（或 `npm run start`）。  
4. **Env vars**：添加 `GEMINI_API_KEY` 等密钥。  
5. **Tips**：Queue 阶段失败通常与未启用 Node build 或平台拥堵有关；`exit code 139` 是 Deno Node 兼容层已知问题，切换到 Node build 可规避。

## Troubleshooting / 常见问题
- **Queue Failed**: 确认 Deno 状态页无异常，并检查是否启用了 Node build。  
- **Build exit code 139**: Deno 的 Node 兼容层在 `next build` 时崩溃，优先使用 Node 构建流程。  
- **Lint Warning about `<img>`**: Next.js `@next/next/no-img-element` 默认提示，可换成 `next/image` 或按需在 ESLint 中忽略。  
- **API Key Missing**: `/api` 返回 `GEMINI_API_KEY 未配置` 时，确保 `.env.local` 或设置页已经保存密钥。

## Contributing / 贡献指南
- 阅读 [`AGENTS.md`](AGENTS.md) 了解文件结构、编码规范、AI 流程与 PR 要求。  
- 提交前务必运行 `npm run lint`、`npx jest --runInBand`、`deno test --allow-read --allow-env`（如适用），并确认 `npm run build` / `deno task build` 通过。  
- Prompt / Draft schema 变更需在 PR 中记录迁移策略、附截图或 Loom，并同步任何 `[Gemini]` / `[Imagen]` 控制台异常。

Let’s keep SocialCopy AI delightful for contributors and creators! / 期待与你一起让 SocialCopy AI 更加出色！
