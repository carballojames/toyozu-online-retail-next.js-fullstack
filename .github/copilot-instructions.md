<!-- Copied/merged guidance for AI coding agents specific to this repo. -->
# Copilot instructions — Toyozu (concise)

Purpose: give an AI coding agent the immediate, practical knowledge to work productively in this repository.

- **Project type:** Next.js 16 App Router + TypeScript + Tailwind CSS. See [app/layout.tsx](app/layout.tsx#L1-L40) for App Router usage.
- **DB / ORM:** Postgres + Prisma. The schema is at [prisma/schema.prisma](prisma/schema.prisma#L1-L40). Generated client imports use `@/generated/prisma/client` (see [lib/prisma.ts](lib/prisma.ts#L1-L40)).
- **Run / build:** Use `npm run dev` (starts `next dev --webpack`). Build runs `prisma generate && next build --webpack` and `postinstall` runs `prisma generate` (see [package.json](package.json#L1-L40)).

Key conventions and patterns (do not invent alternatives):
- The app uses Next.js App Router under `app/` (server and client components). Prefer placing server code in `app/api/*` and UI in `components/` or `components/ui/`.
- Shared UI primitives live in `components/ui/` (e.g., `button.tsx`, `input.tsx`). Follow existing prop and CSS class patterns when adding components.
- Prisma client is wrapped in `lib/prisma.ts` using `@prisma/adapter-pg` + `pg` Pool. Always import the client from `@/generated/prisma/client` or `lib/prisma.ts` to reuse the pooled client and avoid creating multiple connections.
- DB connection config: `DATABASE_URL` env var (standard). Migrations live in `prisma/migrations/` and there is a `prisma/seed.ts` file for seeding.

Notable implementation choices (why they matter):
- Custom Prisma adapter + `pg` Pool (see [lib/prisma.ts](lib/prisma.ts#L1-L40)): agents must not instantiate new PrismaClients indiscriminately in long-running dev servers; reuse `lib/prisma.ts` to prevent connection leaks.
- Images and binary blobs: `product_image` model includes `image_bytes` (see `prisma/schema.prisma`) — image handling uses `sharp` (dependency) so image processing code should use `sharp` utilities already present or add minimal helpers that reuse existing patterns.

Developer workflows (explicit commands and tips):
- Dev server: `npm run dev` (or `pnpm dev` / `yarn dev`).
- Build: `npm run build` (this runs `prisma generate` first). When adding/altering Prisma models run `npx prisma generate` and `npx prisma migrate dev` as needed.
- Lint: `npm run lint` (project has ESLint configured). There are no tests in the repo root; do not assume a test runner unless you add one.

Patterns for making changes safely:
- Database model changes: update `prisma/schema.prisma` then run `npx prisma migrate dev` locally; keep `prisma generate` in build pipeline intact.
- API endpoints: add server code to `app/api/<name>/route.ts` using Next.js Route Handlers. For pages, modify files under `app/` (App Router) not `pages/`.
- Server vs client components: prefer server components by default; add `"use client"` at top of files that need client behavior. Follow existing file styles in `app/` and `components/`.

Where to look for concrete examples:
- App Router and layout: [app/layout.tsx](app/layout.tsx#L1-L40)
- Prisma client usage and pooling: [lib/prisma.ts](lib/prisma.ts#L1-L40)
- DB schema: [prisma/schema.prisma](prisma/schema.prisma#L1-L40)
- Scripts and build hooks: [package.json](package.json#L1-L40)
- UI primitives: [components/ui/](components/ui/)

What to avoid / common pitfalls discovered in the codebase:
- Do not create ad-hoc PrismaClient instances — use `lib/prisma.ts`.
- Avoid adding global CSS resets that conflict with Tailwind; use existing `globals.css`.
- Do not assume serverless function semantics (project runs with a pooled Postgres adapter).

If you change infra or migration behavior, call out required local commands in the PR description (e.g., `npx prisma migrate dev --name <desc>` and `npx prisma generate`).

When opening a PR, include:
- Files changed and short rationale (DB or UI change).
- Any migration commands required and whether seed data needs to be updated.
- A note if new env vars are required (e.g., `DATABASE_URL`).

If anything here is unclear or you want more examples (API handler, UI component, image pipeline), tell me which area to expand and I'll add 2–3 concrete code snippets from the repository.

-- End of agent guidance
