# MSP Help Desk — Client Portal

A multi-tenant **Layered Monolith** Help Desk and Infrastructure Management client portal built on the **PERN stack** (PostgreSQL, Express, React, Node.js) with TypeScript.

## Project Structure
The repository is set up as a monolith split into two main sections:
- **`server/`:** Node.js + Express backend using a Layered Architecture (Routes, Controllers, Services, Repositories).
- **`client/`:** React frontend with modern typography, custom hooks, and Tailwind/Vanilla CSS components.

---

## Multi-Tenant Architecture

This portal uses a **Shared Database, Shared Schema** multi-tenant architecture. All tenant data is partitioned logically using a `tenant_id` foreign key.

### Tenant Scopes & Isolation
1. **Tenants (`tenants` table):**
   Represents Client Organizations (e.g. Acme Corporation, Beta Industries) or the service provider (`MSP Provider`).
2. **Client Users (`CLIENT` role):**
   Belong strictly to their respective tenant and can only query/interact with resources (Tickets, Subscriptions, Invoices) belonging to their `tenant_id`.
3. **Staff Users (`ADMIN` & `TECHNICIAN` roles):**
   Belong to the provider tenant and have cross-tenant permissions to view and manage tickets, dispatch technicians, and resolve issues across all client tenants.

### Partitioned Database Tables
Every tenant-scoped table has a `tenant_id` foreign key referencing `tenants(id) ON DELETE CASCADE` with index optimization for fast queries:
- `users`
- `tickets`
- `subscriptions`
- `invoices`
- `ticket_attachments`
- `ticket_events`

---

## Drizzle ORM Integration

The backend server uses **Drizzle ORM** for type-safe database queries.
- **Schema Definition:** Configured in [schema.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/db/schema.ts) mapping all Postgres tables and enums.
- **Client Instance:** Exports the `db` client from [index.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/db/index.ts) wrapping the pg connection pool.
- **Drizzle Config:** Configured in [drizzle.config.ts](file:///c:/Users/Public/Workspace/msp_client_portal/server/drizzle.config.ts).

### Drizzle Kit CLI Commands

From the `server` directory, you can run:
- **Open Drizzle Studio:** Opens a browser-based database inspector:
  ```bash
  npx drizzle-kit studio
  ```
- **Generate Migrations:** Scans `schema.ts` and generates corresponding SQL migration scripts:
  ```bash
  npx drizzle-kit generate
  ```
- **Push Schema changes:** Directly updates the database schema to match `schema.ts` without generating a migration (recommended for quick development cycles):
  ```bash
  npx drizzle-kit push
  ```

---

## Getting Started

### Database Setup
To configure the PostgreSQL database and run migrations/seeds:

1. **Configure Environment Variables:**
   Copy `server/.env.example` to `server/.env` and update the database username, password, name, and port.

2. **Apply Database Migrations:**
   Run the initial schema, add language columns, and then establish the multi-tenant tables:
   ```bash
   # From root directory:
   npm run db:migrate --prefix server
   # Run the multi-tenancy migration script directly:
   npx tsx server/src/db/apply_migration_003.ts
   ```

3. **Seed Database:**
   Populate initial records (tenants, users, tickets, subscriptions, invoices):
   ```bash
   npm run db:seed --prefix server
   ```

### Running Locally
To launch the client and server application:

1. **Start Backend Server (Port 3001):**
   ```bash
   npm run dev --prefix server
   ```
2. **Start Frontend Client (Port 5173):**
   ```bash
   npm run dev --prefix client
   ```

---

## API Documentation
The backend server serves Swagger API documentation.
Once the server is running, visit: [http://localhost:3001/api-docs](http://localhost:3001/api-docs) to view details, parameters, and payloads.
