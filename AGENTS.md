# AI Agent Registry & Development Guidelines

This document serves as both the registry for active and referenced AI agents within this monorepo, and the guidelines for agent development and boundaries.

---

## AI Agent Registry

### Overview
This monorepo utilizes a structured, multi-agent collaboration workflow modeled after Test-Driven Development (TDD) principles. Different agents handle specialized phases of the lifecycle: design and coordination, test creation, code implementation, and database orchestration.

### Active Agent Registry
The following agent is actively configured with dedicated skill assets and instructions in the workspace:

| Agent Name | Description / Core Purpose | Location | Capabilities & Tools |
| :--- | :--- | :--- | :--- |
| **implementer-agent** | Implements backend business logic (use cases) and Next.js App Router API route handlers to make failing tests pass (Green phase of TDD). | [.agents/skills/implementer-agent-skill](file:///c:/Users/Public/Workspace/msp_client_portal/.agents/skills/implementer-agent-skill) | - Custom use case validation templates using Zod `safeParse`. <br>- Dependency injection patterns for services. <br>- Context7 MCP integration (Zod, TypeScript, Next.js). <br>- CASL ability mapping (`defineAbilitiesFor`). |

### Referenced Coordination Roles (External/Inactive)
The following roles are referenced in the monorepo's workflows and guidelines to coordinate with the `implementer-agent`, but do not have local skill configurations in the `.agents/` folder:

| Role Name | Description / Core Purpose | Notes |
| :--- | :--- | :--- |
| **Architect Agent** | Coordinates tasks, writes/updates PRDs, maps service interfaces, and ensures database/client alignment. | Acts as the orchestrator of the development flow. |
| **Test Agent** | Creates comprehensive failing test suites before any feature implementation. | Establishes the code contract. |
| **Supabase Agent** | Implements database schemas, seed data, and Row Level Security (RLS) policies. | Manages the persistent data layer. |

---

## AI Agent Workflow Rules
- Always initiate `sequential-thinking` before implementing features.
- Cross-reference new framework code via `context7` to stop hallucinations.
- Query `stitch` for layout specs and use `shadcn` MCP tools for UI components.

## 1. Project Architecture
This project is a **Layered Monolith** using the **PERN Stack** (PostgreSQL, Express, React, Node.js). All code (frontend and backend) resides in this single monorepo with strict separation of concerns.

## 2. Tech Stack
- **Database:** PostgreSQL 16 (via Docker Compose), Drizzle ORM for queries and migrations.
- **Backend:** Node.js + Express 5, TypeScript, Winston (logging), JWT + Google OAuth (auth), Nodemailer (email), Multer (file uploads).
- **Frontend:** React 19, TypeScript, Vite 8 (build tool), Tailwind CSS v4 (styling), shadcn/ui + Radix UI primitives, Zustand (state management), react-router-dom v7 (routing), react-hook-form + Zod (forms), i18next (i18n), Axios (HTTP), @tanstack/react-table (tables), Lucide (icons).
- **Testing:** Vitest (both client + server), @testing-library/react + jsdom (client), Supertest-style via Node env (server).
- **API Documentation:** Swagger (OpenAPI 3.0) via swagger-jsdoc + swagger-ui-express.

## 3. Directory Structure (Monolith)
Respect the following structure when generating or modifying files:

```
/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components (auth/, layout/, ui/)
│   │   ├── pages/              # Page views (ClientDashboard, TechDashboard, TicketsPage, etc.)
│   │   ├── services/           # API calls via Axios (ticketService, authService, etc.)
│   │   ├── hooks/              # Custom React hooks (useAuth, useMobile, useSLATimer)
│   │   ├── store/              # Zustand state stores (useAuthStore, useNotificationStore)
│   │   ├── lib/                # Utility functions (cn helper for shadcn)
│   │   ├── locales/            # i18n translation files (en_US.json, es_DO.json)
│   │   └── assets/             # Static images and icons
├── server/                     # Express backend (layered architecture)
│   ├── src/
│   │   ├── routes/             # Endpoint definitions (routing only, no logic)
│   │   ├── controllers/        # HTTP request handling (req/res parsing, delegates to services)
│   │   ├── services/           # Core business logic (SLA validation, Round-Robin assignment)
│   │   ├── repositories/       # Data access layer (Drizzle ORM queries, PostgreSQL only)
│   │   ├── middleware/          # Express middleware (auth, RBAC, error handler, file upload, validation)
│   │   ├── db/                 # Database schema, migrations, seeds, Drizzle client
│   │   ├── dtos/               # Zod validation schemas (auth.dto, ticket.dto, etc.)
│   │   ├── types/              # TypeScript type definitions
│   │   ├── config/             # App config (env validation, constants, DB pool)
│   │   ├── utils/              # Utilities (emailService, whatsappService, passwordUtils, AppError, logger)
│   │   └── swagger/            # OpenAPI 3.0 configuration
└── AGENTS.md                   # This file
```

## 4. Backend Layer Rules (CRITICAL)
- **Routes (`routes/`):** MUST NOT contain business logic. Only delegate to controllers.
- **Controllers (`controllers/`):** Handle `req` parsing, input validation, call the appropriate service, and return `res`. Never contain business logic.
- **Services (`services/`):** ALL business logic lives here (e.g., 1-hour SLA enforcement, Round-Robin ticket distribution). Services MUST NOT know about HTTP (no req/res).
- **Repositories (`repositories/`):** The ONLY layer authorized to interact with PostgreSQL. Services call repositories. Repositories return typed data.
- **Data flow:** Route → Controller → Service → Repository → DB (and back).

## 5. Business Rules to Consider
When generating code for modules, keep the system's functional context in mind:

1. **Tickets:** Core entity. Have states (open, in_progress, resolved, closed) and categories (Repair, Warranty, Service Outage).
2. **1-Hour SLA:** Strict time validations for post-creation actions on warranty/service tickets.
3. **Assignment:** The assignment service must support equitable distribution (Round-Robin) and filtering by technician specialty (e.g., "TV Technician").
4. **Events & Notifications:** Ticket state changes in the Service layer must trigger automated notifications (Email/WhatsApp) via functions in the `utils/` folder.

## 6. Lint, Typecheck & Test Commands

### Client
| Command | Usage |
|---|---|
| Lint | `cd client && npm run lint` |
| Typecheck | `cd client && npx tsc --noEmit` |
| Test (all) | `cd client && npm test` (watch) or `npm run test:run` (single run) |
| Test (single) | `cd client && npx vitest run <path-to-test>` |

### Server
| Command | Usage |
|---|---|
| Lint | `cd server && npm run lint` |
| Typecheck | `cd server && npx tsc --noEmit` |
| Test (all) | `cd server && npm test` |
| Test (single) | `cd server && npx vitest run <path-to-test>` |
| Test (watch) | `cd server && npm run test:watch` |

## 7. Code Style & Technical Conventions

- **TypeScript:** Strict mode enabled. Never use `any`. Never use `@ts-ignore` or `@ts-expect-error`. Prefer explicit types over inference for function signatures.
- **Components:** Functional components only (no class components). Use React hooks for state and side effects.
- **State management:** Use Zustand stores in `client/src/store/`. Avoid prop drilling beyond 2 levels.
- **Styling:** Tailwind CSS v4 (no `tailwind.config.js` needed). Use the `cn()` utility from `client/src/lib/utils.ts` for conditional class merging. Use shadcn/ui primitives from `client/src/components/ui/`.
- **Internationalization:** All user-facing strings go through i18next (`t()` function). Translation files in `client/src/locales/` (en_US + es_DO).
- **API calls:** Always use the shared Axios instance in `client/src/services/api.ts` (handles JWT token injection and refresh).
- **Validation:** Zod schemas in `server/src/dtos/` for backend. react-hook-form + Zod resolvers on the frontend.
- **Error handling:** Backend errors use `AppError` class from `server/src/utils/AppError.ts`. Controllers catch and pass to `errorHandler` middleware.
- **Logging:** Use Winston (`server/src/utils/logger.ts`) — never `console.log` in server code.
- **File naming:**
  - React components: PascalCase (`TicketDetailPage.tsx`)
  - Services/hooks/utils: camelCase (`ticketService.ts`, `useAuth.ts`)
  - Routes/Controllers: PascalCase + suffix (`ticket.routes.ts`, `TicketController.ts`)
  - Test files: append `.test.ts` / `.test.tsx` next to the source file.

### Idiomatic Code Samples

**React page with Zustand store:**
```tsx
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react';

export function ClientDashboard() {
  const { user, loading, fetchProfile } = useAuthStore();

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) return <div>Loading...</div>;
  return <h1>Welcome, {user?.name}</h1>;
}
```

**Express controller → service → repository chain:**
```ts
// ticket.controller.ts
export class TicketController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = createTicketSchema.parse(req.body);
      const ticket = await ticketService.create(dto, req.user!.id);
      res.status(201).json(ticket);
    } catch (err) {
      next(err);
    }
  }
}

// ticket.service.ts
export class TicketService {
  async create(dto: CreateTicketDTO, userId: string): Promise<Ticket> {
    const ticket = await ticketRepo.insert({ ...dto, createdBy: userId });
    await notificationService.notifyNewTicket(ticket);
    return ticket;
  }
}

// ticket.repository.ts
export class TicketRepository extends BaseRepository {
  async insert(data: NewTicket): Promise<Ticket> {
    const [row] = await this.db.insert(tickets).values(data).returning();
    return row;
  }
}
```

## 8. Testing & Verification Strategy

- **Framework:** Vitest everywhere. Client uses `jsdom` + `@testing-library/react`. Server uses `node` environment.
- **Coverage requirement:** Every service and util must have tests. Controllers and repositories should have tests for non-trivial logic.
- **Verification lifecycle (MANDATORY):** Before declaring any task complete, the agent MUST run all three:
  1. `npm run lint` — no errors
  2. `npx tsc --noEmit` — no type errors
  3. `npm test` (or scoped test if only touching one area) — all tests pass
- **Evidence-driven execution:** Before modifying a file, verify it exists by reading it or checking the directory listing. Never assume file paths.

## 9. Agent Boundaries & Guardrails

**Never modify without explicit human permission:**
- `.env` files (server or client) — contain credentials
- `docker-compose.yml`
- Any `package-lock.json` or lockfile
- `.gitignore` files
- SQL migration files in `server/src/db/migrations/` (numbered `00x_*.sql`)
- `AGENTS.md` itself
- GitHub Actions / CI/CD workflows (none exist yet, but if created)

**Security rules:**
- Never commit secrets, credentials, or raw API keys. Always use environment variables.
- Never output credential values (passwords, tokens, SMTP creds) in conversation or logs.
- Never expose the contents of `.env` files.

## 10. Git & Workflow Protocols

- **Branch naming convention:**
  - `feature/<short-description>` — new features
  - `fix/<short-description>` — bug fixes
  - `chore/<short-description>` — tooling, dependency updates, refactors
  - `docs/<short-description>` — documentation changes
- **Commit message format (Conventional Commits):**
  ```
  type(scope): description

  [optional body]
  ```
  Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`
  - Scope is optional, lowercase, matches the area (e.g., `tickets`, `auth`, `ui`, `deps`)
  - Description: present tense, lowercase, no period
  - Examples:
    - `feat(tickets): add round-robin assignment for technicians`
    - `fix(auth): handle expired token refresh gracefully`
    - `chore(deps): bump drizzle-orm to 0.46.0`
- **Pull requests:** Push to remote and open a PR via `gh pr create`. Include a summary and link to any related issue.
