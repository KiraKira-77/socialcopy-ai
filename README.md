# SocialCopy AI (MVP)

> Single‑page Next.js demo that turns long‑form content into three social posts plus English image prompts, and can optionally call Imagen 4.0 to render artwork.

## Overview

- Paste any long text, pick a target platform (Twitter, Instagram, LinkedIn, 小红书) and tone (Professional / Humorous / Concise).
- The app sends prompts directly from the browser to Gemini `gemini-2.5-flash-preview-09-2025` and returns exactly three copy variants with English image prompts.
- Each result card lets you copy text, copy the image prompt, and (if you have Imagen access) generate a 1:1 PNG that can be copied or downloaded.
- All state (API key, inputs, generated results) lives in browser memory/localStorage—no backend routes remain.

## Getting Started

```bash
git clone https://github.com/<you>/socialcopy-ai.git
cd socialcopy-ai
npm install
npm run dev
```

- Visit http://localhost:3000.
- At the top of the left column there is a “Gemini API Key” box. Paste any Google Generative AI key that has access to both Gemini and (optionally) Imagen, then click “保存 API Key”. The key is stored only in `localStorage`.
- Alternatively, you can set `NEXT_PUBLIC_GEMINI_API_KEY` in `.env.local`; the UI will read it automatically.

## Usage

1. **原始内容输入**：粘贴最多 5000 字符的长文案。进度条会实时显示已用字符数，输入框可拖拽拉伸。
2. **目标人群（可选）**：输入受众描述以便增强 system prompt。
3. **选择目标平台 / 文案语气**：点选四个平台和三种语气之一。
4. **生成**：桌面端点击左下按钮；移动端使用底部浮动按钮。大约 10–15 秒即可返回三条结果。
5. **图像**：在每张结果卡中点击 “生成配图” 即可调用 Imagen 4.0（前提是 API key 具备权限）。

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js in development mode. |
| `npm run build` | Build the production bundle. |
| `npm run start` | Run the production server (after `npm run build`). |
| `npm run lint` | Run `next lint`. |

## Tech Stack

- Next.js App Router (React 19, TypeScript) with the `app/` directory.
- Tailwind-like utility classes via plain CSS modules in `globals.css`.
- No backend APIs—front-end `fetch` talks directly to Google Generative Language APIs.

## Deployment Notes

- Because the UI calls Gemini/Imagen from the browser, deploy to any static or Node host (Vercel, Netlify, etc.).
- Ensure `NEXT_PUBLIC_GEMINI_API_KEY` is configured in the hosting environment **only if** you want to bundle a default key; otherwise rely on the UI entry.
- There is no server secret storage, so **never** ship a production key unless you are comfortable exposing it to users.

## Troubleshooting

- **`Gemini API 请求失败`**: The key may lack access to `gemini-2.5-flash-preview-09-2025`.
- **`Imagen API 请求失败`**: Either Imagen is not enabled for the key or quota is exhausted.
- **Request aborted**: Gemini sometimes needs >10 s; the UI retries up to three times with exponential backoff.

Enjoy the simplified demo! Pull requests are welcome if you want to extend the UI or re-introduce backend routes. 
