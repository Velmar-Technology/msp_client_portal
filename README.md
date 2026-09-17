<div align="center">

# MSP Help Desk — Client Portal

**Multi-tenant help desk, billing, and infrastructure management platform for managed service providers.**

[![Version](https://img.shields.io/badge/version-1.11.5-2563EB)](https://github.com/Velmar-Technology/msp_client_portal/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)](https://tauri.app/)
[![License](https://img.shields.io/badge/license-Proprietary-blue)](#license)

<!-- Logo / hero screenshot placeholder — replace with a live app screenshot hosted on your CDN:
<p align="center"><img src="https://helpdesk.velmartech.com.do/hero.png" alt="Platform screenshot" width="720"/></p>
-->

</div>

## What is this?

A production **MSP client portal** that gives clients a self-service window into their IT operations while giving technicians a single command center. It is a multi-tenant **modular monolith** built on the PERN stack (PostgreSQL, Express, React, Node.js) with TypeScript, Drizzle ORM, Vite, Tailwind CSS v4, and a desktop tray agent built on Tauri.

**Capabilities at a glance:**

- **Help desk & dispatch** — ticket lifecycle, round-robin assignment, 1-hour SLA cancellation, time-based tier escalation, and automated alert remediation with a noise-control engine.
- **RMM & remote monitoring** — live workstation telemetry, alerting, self-healing scripts, and a desktop tray agent (`msp-tray` + `msp-agent`).
- **Billing & invoicing** — recurring renewal scheduler, PayPal capture, wire-transfer validation, 18% ITBIS tax, and Dominican NCF Series B01 auto-issuance.
- **Subscriptions & entitlements** — plan quotas, license true-up, feature gating, and upsell previews.
- **Account health & non-payment scale** — composite health scoring (BL-601) and a 4-tier suspension scale with automated restoration.
- **Finance for MSP owners** — technician commissions with 48-hour holdback, OpEx ledger, and a 70/30 net-profit split.
- **Security** — RBAC + Zanzibar ReBAC + policy-as-code ABAC, zero standing privileges (JIT/ephemeral access), workload identity (SPIFFE), and step-up MFA.
- **AI-ready & AIaaS** — an isolated Model Context Protocol (MCP) server exposing 66+ tools across dual profiles: IT support diagnostics/remediation (`/mcp`) and CAF Educational Quality evaluation with Dominican Law 172-13 PII sanitization and multi-tenant BYOK LLM routing (`/mcp/caf`).

## Architecture

- **Monorepo:** modular monolith with `server`, `client`, and `packages/*` in an npm workspace.
- **Clean Architecture:** dependency rules pointing strictly inward (Frameworks → Interface Adapters → Use Cases → Entities).
- **Contract-first:** request/response contracts and Zod schemas live in `@shared/contracts` as the single source of truth.
- **State:** server state via TanStack Query; Zustand reserved for ephemeral client UI state.
- **Deployment:** GitHub Actions → GHCR images → Portainer stack deployed to a helpdesk VPS with automatic rollback.

> 📚 The full architecture and master business-logic specification live in [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md).

## Quick Start

Requirements: **Node.js 22+**, **npm 10+**, **PostgreSQL 16**, and **Redis**.

```bash
# 1. Install workspace dependencies
npm install

# 2. Build shared packages (@shared/errors, @shared/contracts, MCP server)
npm run build:packages

# 3. Configure the backend
cp server/.env.example server/.env   # set DB, Redis, JWT secrets

# 4. Run migrations and seed
npm -w server run db:migrate
npm run db:seed --prefix server

# 5. Start backend (port 3001) and frontend (port 5173)
npm -w server run dev
npm -w client run dev
```

Open [http://localhost:5173](http://localhost:5173). Interactive API docs are at [http://localhost:3001/api-docs](http://localhost:3001/api-docs).

## Repository Layout

```
server/            # Express 5 API, Drizzle ORM schema, domain modules, schedulers
client/            # React 19 + Vite + Tailwind v4 client portal
packages/
  contracts/       # @shared/contracts — unified Zod schemas & API contracts
  errors/          # @shared/errors — standardized domain error primitives
  mcp-server/      # @msp/mcp-server — MCP tooling server for AI assistants
  msp-agent/       # Local device telemetry & management agent
  msp-tray/        # Tauri 2 desktop tray agent (workstation help desk)
docs/              # Architecture, ADRs, infrastructure runbooks
.github/workflows/ # CI, quality, deploy & release pipelines
```

## Documentation

- **Architecture & business rules** → [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md)
- **Design decisions (ADRs)** → [docs/decisions](docs/decisions)
- **Knowledge Graph (GraphRAG)** → [docs/decisions/ADR-012-offline-graphrag-knowledge-graph-and-host-agent-extraction.md](docs/decisions/ADR-012-offline-graphrag-knowledge-graph-and-host-agent-extraction.md)
- **Infrastructure & runbooks** → [docs/infrastructure](docs/infrastructure)
- **Commit conventions & workflow** → [CONTRIBUTING.md](CONTRIBUTING.md)

## Security

Security isn't an afterthought here — it's the platform's core (RBAC, ReBAC, ABAC, ZSP, SPIFFE workload identity, step-up MFA). If you find a vulnerability, please report it privately. See [SECURITY.md](SECURITY.md).

## Status & Releases

See the [releases page](https://github.com/Velmar-Technology/msp_client_portal/releases) and the [CHANGELOG.md](CHANGELOG.md).

## License

Proprietary. © 2026 Velmar Technology. All rights reserved. See [LICENSE](LICENSE).