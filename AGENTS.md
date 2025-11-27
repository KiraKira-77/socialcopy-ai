# Repository Guidelines

## Project Structure & Module Organization
Runtime routes reside in `src/app`, and every route folder keeps `page.tsx`, `layout.tsx`, a CSS Module, and static assets side by side. Dynamic paths use `[slug]` folders, shared types belong in `src/app/types.ts`, and API handlers plus fixtures live under `src/app/api`. Place feature-focused tests in sibling `__tests__` directories such as `src/app/panel/__tests__/Panel.test.tsx`, keep shared tokens in `src/app/globals.css`, and store repo-wide configs (`next.config.ts`, `tsconfig.json`, `deno.json`, `.eslintrc.json`) at the root.

## Build, Test, and Development Commands
- `npm run dev` / `deno task dev` – hot-reload the Next.js app.
- `deno task build` – produce the optimized production bundle.
- `npm run start` or `deno task start` – preview the built output locally.
- `npm run lint` – run `next lint` using the repo ESLint rules.
- `npx jest --runInBand` – execute React specs serially to avoid data races.
- `deno test --allow-read --allow-env` – validate API fixtures and helpers.

## Coding Style & Naming Conventions
Write strict TypeScript, avoid `any`, and format TS/TSX with two-space indentation plus double quotes. Components follow PascalCase, hooks/utilities use camelCase, and folders mirror the `[slug]` route segments. Keep page-level styles scoped via CSS Modules and reserve `src/app/globals.css` for shared tokens. ESLint with `next lint` enforces formatting before commits, so fix errors instead of bypassing them.

## Testing Guidelines
Rely on React Testing Library in co-located `__tests__` folders and name files `Feature.test.tsx`. Keep statement coverage at or above 80%, snapshot only stable shells, and mock Gemini, Imagen, and network hooks to keep specs deterministic. Every API helper needs a paired fixture in `src/app/api`, and both Jest plus Deno suites must pass before merging. Run `npx jest --runInBand` followed by `deno test --allow-read --allow-env` locally or in CI.

## Commit & Pull Request Guidelines
Commits stay short and imperative, e.g., `add ai prompt panel`. PRs describe motivation, link the issue, and list results for `npm run lint`, `npx jest --runInBand`, `deno task build`, and `deno test --allow-read --allow-env`. Attach UI/AI screenshots or Looms, flag Gemini/Imagen contract changes, document locale coverage gaps, and record any `[Gemini]` or `[Imagen]` anomalies seen during QA. Rebase onto `main` before requesting review to keep history linear.

## AI Workflow & Drafts
Platform prompt templates persist in `localStorage`, so schema migrations must include backward-compatible fallbacks. Result cards must display language and mode badges plus real-time readability, engagement, and CTA scores, and Imagen 4.0 calls should emit 1:1, 16:9, and 9:16 `imageVariants` with download and copy controls. Drafts track platform, tone, language, modality, and prompt overrides; keep migrations documented and ensure transforms update prompts, result cards, and Imagen payloads. Always ship `en-US` and `zh-CN` strings together and note any missing locales in the PR summary until the shared dictionary lands.
