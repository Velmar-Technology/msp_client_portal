# Project: msp_client_portal

## Tech Stack
- **Architecture:** Modular Monolith in npm workspace monorepo (`client`, `server`, `packages/*`).
- **Backend:** Node.js v22+ (Strict TypeScript), ESM, Express 5.x, Drizzle ORM 0.45.x, PostgreSQL 16+, Redis (`ioredis`), Winston Logger, Vitest.
- **Frontend:** React 19.x, Vite 8.x, Tailwind CSS v4, shadcn/ui (`radix-ui`), Zustand, React Hook Form + Zod, TanStack Table, i18next.
- **Packages:** `@shared/errors`, `@msp/mcp-server`.

## Workspace Commands
- **Install Dependencies:** `npm install`
- **Dev Backend / Frontend:** `npm -w server run dev` / `npm -w client run dev`
- **Typecheck / Build:** `npm -w server run build` / `npm -w client run build`
- **Build Shared Packages:** `npm run build:packages`
- **Run Tests:** `npm -w server run test` (Backend) / `npm -w client run test:run` (Frontend)
- **Database Migrations:** `npm -w server run db:migrate`
- **Linting:** `npm -w server run lint` / `npm -w client run lint`

## Architecture & Quality Standards
- Read `CONSTRAINTS.md` before writing code. Do not weaken it to make a change pass.
- Master specifications and business logic rules are documented in `AGENTS.md`.
- Dependencies point strictly **INWARD**: Frameworks/Drivers → Interface Adapters → Use Cases → Entities.
- Expose domain public APIs exclusively via `server/src/modules/<domain>/index.ts`. No cross-module internal imports.
- Frontend primitives MUST use `client/src/components/ui/` (`shadcn/ui`).
- All exported services, repositories, controllers, and hooks must include complete TSDoc/JSDoc annotations (`@param`, `@returns`, `@throws`).
