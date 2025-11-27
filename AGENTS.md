# Repository Guidelines

## Project Structure & Module Organization
Runtime routes live in `src/app`, each folder co-locating `page.tsx`, `layout.tsx`, a CSS Module, and any static assets; use `[slug]` for dynamic segments. Shared tokens live in `src/app/globals.css`, API handlers plus fixtures in `src/app/api`, and contracts in `src/app/types.ts`. Feature tests stay inside sibling `__tests__` directories (e.g., `src/app/panel/__tests__/Panel.test.tsx`). Root configs (`next.config.ts`, `tsconfig.json`, `deno.json`, `.eslintrc.json`) house shared tooling.

## Build, Test, and Development Commands
- `deno task dev` / `npm run dev` – hot-reload the Next.js app.
- `deno task build` – create the optimized production bundle.
- `deno task start` / `npm run start` – preview the production build locally.
- `npm run lint` – run `next lint` with the repo ESLint rules.
- `npx jest --runInBand` – execute component specs serially.
- `deno test --allow-read --allow-env` – validate API fixtures and helpers.

## Coding Style & Naming Conventions
Use strict TypeScript with explicit types (avoid `any`), two-space indentation, and double quotes in TS/TSX. Components use PascalCase, hooks/utilities camelCase, and folders follow the `[slug]` pattern. Keep page styles next to their routes via CSS Modules, rely on `globals.css` for shared tokens, and enforce formatting with ESLint plus `next lint`.

## Testing Guidelines
Favor React Testing Library in feature-scoped `__tests__` folders using filenames such as `Panel.test.tsx`. Maintain ≥80% statement coverage, snapshot only stable UI, and mock Gemini, Imagen, and network hooks. Couple every API helper with a fixture under `src/app/api` and exercise it through `deno test --allow-read --allow-env` plus Jest.

## Commit & Pull Request Guidelines
Write short, imperative commits (e.g., `add ai prompt panel`). PRs must explain motivation, link the issue, and list the results of `npm run lint`, `npx jest --runInBand`, `deno task build`, and `deno test --allow-read --allow-env`. Include UI/AI screenshots or Looms, call out prompt or Gemini/Imagen contract changes, rebase on `main`, and log any `[Gemini]` or `[Imagen]` anomalies seen during QA.

## AI Workflow & Drafts
“平台 Prompt 设置” templates persist in `localStorage`, so migrations need backward-compatible fallbacks. Result cards must surface language/mode badges plus live readability, engagement, and CTA scores, and Imagen 4.0 responses should emit 1:1, 16:9, and 9:16 `imageVariants` with download/copy controls. Drafts capture platform, tone, language, modality, and prompt overrides, so schema updates require data transformations and release notes. Always ship `en-US` and `zh-CN` strings together, ensure toggles update result cards, prompts, drafts, and Imagen payloads, and document missing locales in the PR until the centralized dictionary is available.
