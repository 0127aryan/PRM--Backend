# PRM Backend (NestJS)

## Prerequisites

- Node.js 20+
- **Supabase PostgreSQL** database
- Add data via the **admin UI** / frontend (no seed scripts)

## Database

Copy `.env.example` to `.env` and set your Supabase credentials (see `src/database/migrations/README.md`).

```bash
npm run migration:run   # first-time schema setup
```

## Setup

```bash
cp .env.example .env
npm install
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Dev server with watch (`scripts/dev-watch.cjs`) |
| `npm run build` | Compile |
| `npm run start:prod` | Run `dist/main.js` |
| `npm run migration:show` | TypeORM migration status (optional) |

## Endpoints

| URL | Auth | Description |
|-----|------|-------------|
| `GET /api/health` | Public | API + database ping |
| `GET /api/database/status` | Public | Tables + migration info |
| `POST /api/auth/login` | Public | Email login → httpOnly JWT cookies |
| `POST /api/auth/refresh` | Public | Refresh access cookie |
| `POST /api/auth/logout` | Public | Clear cookies + revoke refresh |
| `POST /api/auth/set-password` | Public | First-time password from setup token |
| `GET /api/auth/set-password/validate?token=` | Public | Check setup token |
| `GET /api/auth/me` | Cookie | Current user |
| `POST /api/auth/change-password` | Cookie | Change password |
| `/api/docs` | Public | Swagger UI |

Use `credentials: 'include'` from the Next.js frontend (CORS `FRONTEND_URL`).

## Phase 2 complete

- JWT access (~15m) + refresh (7d) in httpOnly cookies
- Login by email, set-password flow, change-password
- Global `JwtAuthGuard` + `RolesGuard` (`@Public()`, `@Roles()`)

## Admin endpoints (Phase 3 — require ADMIN cookie)

| Area | Paths |
|------|--------|
| Users | `GET/POST /api/admin/users`, `GET /api/admin/users/:id`, `POST .../setup-link`, `reset-password`, `deactivate`, `reactivate` |
| Employees | `GET/POST /api/admin/employees`, `PATCH /api/admin/employees/:id`, `PUT .../skills`, `POST .../deactivate` |
| Projects | `GET/POST/PATCH /api/admin/projects`, milestones under `.../milestones` |
| Skills | `GET/POST /api/admin/skills` |
| Settings | `GET/PATCH /api/admin/settings/config`, `GET/POST /api/admin/settings/activity-tags` |
| Allocations | `GET /api/admin/allocations` |

## Manager endpoints (Phase 4 — require MANAGER cookie + employee profile)

| Area | Paths |
|------|--------|
| Dashboard | `GET /api/manager/dashboard`, `GET /api/manager/dashboard/employees/:id` |
| Projects | `GET /api/manager/projects`, `GET :id`, `GET :id/risk-flags`, `PATCH :id/status` |
| Employees | `GET /api/manager/employees`, `GET :id` (direct reports only) |
| Allocations | `POST /api/manager/allocations`, `PATCH /api/manager/allocations/:id/end` |
| Matching | `POST /api/manager/matching/search` |
| Timesheets | `GET /api/manager/timesheets?weekStart=YYYY-MM-DD` |

Allocation rules: employee must report to you **and** project `manager_id` must be your `employees.id`.

## Employee endpoints (Phase 5 — require EMPLOYEE cookie + employee profile)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/employee/activity-tags` | Active predefined tags |
| GET | `/api/employee/allocations` | My active allocations |
| GET | `/api/employee/timesheets` | My timesheets (`?weekStart=` optional) |
| GET | `/api/employee/timesheets/reminders` | Missed / not submitted past weeks |
| POST | `/api/employee/timesheets` | Submit week (Monday `weekStart`, whole hours) |

Submit rules: projects must be actively allocated for that week; per-project hours ≤ `utilization% × max_weekly_hours`; total ≤ `max_weekly_hours` (from `system_config`, default 40 if unset).

## Scheduler (Phase 6)

| Setting | Description |
|---------|-------------|
| `SCHEDULER_ENABLED` | `true` to run cron jobs |
| `SCHEDULER_CRON` | Cron expression (default `0 * * * *` = hourly) |

Jobs on each run:

1. **Employee status** — `BENCH` vs `ALLOCATED` from active allocations today  
2. **Missed timesheets** — last completed week → `MISSED` if not `SUBMITTED`  
3. **Project health** — `ON_TRACK` / `ATTENTION` / `AT_RISK` (milestones + last-week hours vs allocation %)

Manual run (admin): `POST /api/admin/scheduler/run`

## Matching & assistant (Phase 7)

| Endpoint | Description |
|----------|-------------|
| `POST /api/manager/matching/search` | Scored keyword/skill match + `reasons[]` |
| `POST /api/manager/assistant/skill-match` | Same engine for allocate UI |
| `POST /api/manager/assistant/risk-summary` | Template risk summary (`mode: keyword`) |

Set `matching_mode=keyword` in `system_config` via **Admin → Settings** (or a manual `system_config` row).

## Tests (Phase 8)

```bash
npm test              # unit: matcher, risk summary, week utils, login DTO
npm run test:e2e      # e2e: health + validation (needs .env + Supabase for full app)
```

Create users, projects, skills, and config through the **admin UI** (or Swagger). No seed scripts.

**Next:** Phase 9 — LLM (optional) · Phase 10 — docs/diagrams
