# Enterprise Asset & License Manager (ALM)

[![CI](https://github.com/kheymp/enterprise-alm/actions/workflows/ci.yml/badge.svg)](https://github.com/kheymp/enterprise-alm/actions/workflows/ci.yml)

A full-stack platform for IT teams to track hardware assets and SaaS license seats through their entire lifecycle — built with **.NET 8** (Clean Architecture) and **React 19 + TypeScript**, deployed to production.

## 🔗 Live Demo

**[enterprise-alm-frontend.vercel.app](https://enterprise-alm-frontend.vercel.app)**

Click **"Admin — full access"** on the login page (`demo@enterprise-alm.app`) — a public full-admin sandbox. Change anything; a background job resets the demo data every hour.

| Layer | Hosted on |
| --- | --- |
| React frontend | Vercel |
| .NET API (containerized) | Render |
| PostgreSQL | Neon |

## 📸 Screenshots

**Dashboard** — live inventory summary with allocation charts and an activity feed sourced from the audit log:

![Dashboard](docs/screenshots/dashboard.png)

**License management** — seat usage, per-seat cost, and renewal tracking with expiry warnings:

![License Management](docs/screenshots/licenses.png)

**Audit trail** — automatic change capture: action, entity, changed columns, actor, and timestamp:

![Audit Trail](docs/screenshots/audit-log.png)

## ⭐ Highlights

- **Clean Architecture, enforced by project references** — `Domain` has zero dependencies; `Application` defines repository interfaces that `Infrastructure` implements. Business logic never touches data access.
- **Automatic audit trail** — every entity change is captured via the EF Core `ChangeTracker`: old/new values, changed columns, acting user, UTC timestamp. No per-controller audit code.
- **CI as a required gate** — GitHub Actions builds, lints, and tests both apps on every PR; `main` is branch-protected, so nothing merges red. Merges auto-deploy to Render + Vercel.
- **Self-healing public demo** — an hourly `BackgroundService` wipes visitor changes and re-seeds baseline data, so the live demo can safely offer full admin access.
- **Unit-tested business logic** — xUnit + Moq suites over the auth, asset (depreciation), and license (seat-allocation) services, running in CI.
- **Security fundamentals** — JWT bearer auth with BCrypt-hashed passwords, per-endpoint role enforcement, secrets via user-secrets/env vars (never committed), startup fail-fast on missing config.

## 🚀 Tech Stack

**Backend:** .NET 8 (ASP.NET Core Web API) · Entity Framework Core 8 + Npgsql (PostgreSQL) · JWT Bearer 8.0 · BCrypt.Net-Next 4.2 · Swashbuckle 6.4 (Swagger)

**Frontend:** React 19.2 · TypeScript 6.0 · Material-UI 9 · React Router 7.18 · Recharts 3.9 · Vite 8

**Testing & tooling:** xUnit 2.4 + Moq 4.20 · pnpm 11 workspaces · Turborepo 2 · GitHub Actions · Docker

## ✨ Features

### 💻 Hardware Asset Lifecycle
- Full CRUD over physical assets with serial-number tracking and employee assignment.
- **Maintenance history** — dated service records with cost against any asset.
- **Straight-line depreciation** — current book value computed from purchase price, expected lifespan, and salvage value.

### 🔑 SaaS License Management
- Licenses with seat counts and renewal dates; per-user **seat allocation with capacity enforcement**.
- **Soft deletes** — deactivated licenses are retained for historical reporting.
- `LicenseExpirationJob` (24-hour `BackgroundService`) auto-deactivates licenses past renewal.

### 🛡️ Role-Based Access Control
Three seeded roles enforced per-endpoint with `[Authorize(Roles = ...)]`:

| Role | Access |
| --- | --- |
| **Admin** | Full system control, user management, audit log |
| **Manager** | Read/write assets, licenses, and seats |
| **Viewer** | Read-only dashboards |

### 📜 Audit Trail & Dashboard
- Automatic change capture (old values, new values, changed columns, actor, timestamp) exposed to Admins as a filterable, paginated view.
- Real-time inventory dashboard with a recent-activity feed sourced from the audit log.

### 🖥️ Frontend
- Centralized typed API client (`src/lib/api.ts`) — base URL from environment, unified `ProblemDetails`/validation error parsing.
- Role-aware navigation and route guards driven by the decoded JWT.

## 🏛️ Architecture

```
   Api  ────►  Application  ◄────  Infrastructure
                    │                     │
                    └──────► Domain ◄─────┘
```

| Project | Responsibility |
| --- | --- |
| `Enterprise.ALM.Domain` | Entities and business models. No dependencies. |
| `Enterprise.ALM.Application` | Services, DTOs, repository interfaces. Business logic (e.g., depreciation). |
| `Enterprise.ALM.Infrastructure` | EF Core `DbContext`, repositories, migrations, background jobs. |
| `Enterprise.ALM.Api` | Controllers, JWT/CORS config, DI composition root. |
| `Enterprise.ALM.Tests` | xUnit + Moq unit tests over Application services. |

Entities never cross the HTTP boundary (DTOs only). Migrations apply automatically at startup. Unhandled exceptions return RFC 7807 `ProblemDetails`. The repo is a pnpm workspace orchestrated by Turborepo: .NET solution in `apps/backend`, React app in `apps/frontend`.

## 📦 Running Locally

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) 22+ and [pnpm](https://pnpm.io/) 11+
- PostgreSQL — local install, or Docker:

```bash
docker run --name alm-postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=enterprise_alm -p 5432:5432 -d postgres:16
```

### 1. Configure backend secrets

```bash
cd apps/backend/Enterprise.ALM.Api

dotnet user-secrets init
dotnet user-secrets set "JwtSettings:SecretKey" "<a-random-string-of-at-least-32-characters>"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" \
  "Host=localhost;Port=5432;Database=enterprise_alm;Username=postgres;Password=postgres"
```

> The JWT key **must be at least 32 characters** — the app fails fast at startup otherwise.

### 2. Run the API

```bash
cd apps/backend
dotnet run --project Enterprise.ALM.Api
```

Migrations apply automatically on startup. The API listens on `http://localhost:5132` with **Swagger UI** in development.

### 3. Run the frontend

```bash
pnpm install                 # from the repo root (workspace install)
cd apps/frontend
cp .env.example .env         # sets VITE_API_URL=http://localhost:5132
pnpm dev
```

App runs at `http://localhost:5173` (the origin allowed by the default CORS config).

### 4. Log in

The demo Admin (`demo@enterprise-alm.app` / `Demo!2026`) is seeded automatically at startup along with baseline data — use the login page button or the credentials directly. Self-registration deliberately creates only **Viewer** accounts; promoting a registered account is an Admin operation (or directly in the DB for a first bootstrap):

```sql
UPDATE "Users" SET "RoleId" = 1 WHERE "Email" = 'your.email@example.com';
-- RoleId: 1 = Admin, 2 = Manager, 3 = Viewer
```

## 🔌 API Overview

All endpoints are prefixed with `/api` and require authentication unless noted. Full schemas in Swagger.

| Controller | Endpoints | Required Role |
| --- | --- | --- |
| **Auth** | `POST /auth/register`, `POST /auth/login` | Anonymous |
| **Assets** | `GET /assets`, `GET /assets/{id}` | Admin, Manager, Viewer |
| | `POST /assets`, `PUT /assets/{id}`, `POST /assets/{id}/maintenance` | Admin, Manager |
| | `DELETE /assets/{id}` | Admin |
| **Licenses** | `GET /licenses` | Admin, Manager, Viewer |
| | `POST /licenses`, `PUT /licenses/{id}`, `DELETE /licenses/{id}` | Admin, Manager |
| | `POST /licenses/{id}/allocate`, `DELETE /licenses/{id}/allocate/{userId}` | Admin, Manager |
| **Dashboard** | `GET /dashboard/summary` | Admin, Manager, Viewer |
| **Users** | `GET /users`, `POST /users`, `PUT /users/{id}`, `DELETE /users/{id}` | Admin |
| **AuditLogs** | `GET /auditlogs` (filter by entity, paginated) | Admin |

## 🗺️ Roadmap

- [ ] **Refresh-token rotation** — currently a single 120-minute access token
- [ ] **Integration tests in CI** — throwaway Postgres service container for repository-level tests
- [ ] **FluentValidation** on request DTOs
- [ ] **Frontend type hardening** — burn down the `any` lint-warning backlog; extract data hooks from larger page components

## 👨‍💻 About The Author

Built by **Kheymp** to demonstrate full-stack engineering across a realistic enterprise domain — layered backend design, security fundamentals, and a fully automated path from pull request to production.
