@AGENTS.md

# Ofakim Portal

Hebrew/RTL annual Gantt + event portal for Ofakim municipality (עיריית אופקים). Three audiences:
- **Education staff** (מנהל החינוך) — manage their dept Gantt
- **Youth staff** (מחלקת הנוער) — manage their dept Gantt
- **Public / parents** — read-only "luach" (לוח) calendar, no login

## Stack

- Next.js 16.2 App Router (read AGENTS.md — breaking changes vs older docs)
- React 19.2, TypeScript 5
- Supabase (Postgres + Auth + Realtime). Client: [src/lib/supabase.ts](src/lib/supabase.ts), SSR via `@supabase/ssr`
- Tailwind v4 (`@tailwindcss/postcss`); design tokens in [src/app/globals.css](src/app/globals.css)
- Zustand, TanStack Query, Framer Motion
- `@hebcal/core` — Hebrew dates / holidays
- `@anthropic-ai/sdk` — bot at [src/app/api/bot/route.ts](src/app/api/bot/route.ts), model `claude-sonnet-4-5-20250929` with regex fallback

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing — three dept cards + admin link ([src/app/page.tsx](src/app/page.tsx)) |
| `/login`, `/auth/callback` | 3-step auth: email lookup → register → pending-approval. Google/MS OAuth declared, manual flow active ([src/app/login/page.tsx](src/app/login/page.tsx)) |
| `/education`, `/youth` | Staff Gantt stubs → [StaffGantt.tsx](src/components/StaffGantt.tsx) (943 LOC: 12-month grid, CRUD, realtime sync, year selector, advanced search, upcoming events quick view) |
| `/luach` | Public calendar ([src/app/luach/page.tsx](src/app/luach/page.tsx)) — annual/monthly toggle, dept + age filters, search, export to WhatsApp/Google Cal/iCal, holidays overlay |
| `/luach/onboarding`, `/luach/my`, `/luach/settings` | Parent personalization — multi-step survey → ParentProfile in localStorage → filtered view |
| `/admin` | Dashboard ([src/app/admin/page.tsx](src/app/admin/page.tsx)) — stats, monthly bars, category breakdown, audit log tab, CSV/PDF export |
| `/admin/users` | Approve/manage staff (active toggle gates registration) |
| `/admin/infrastructures` | CRUD venues |
| `POST /api/bot` | Claude-backed Q&A over events + infrastructures + campuses; regex fallback ([src/app/api/bot/route.ts](src/app/api/bot/route.ts)) |

## Domain Model ([src/lib/](src/lib))

- **Category** ([data.ts](src/lib/data.ts)) — 15 fixed categories. Education: `early`, `elementary`, `secondary`, `camps`, `haredi`, `edu-general`, `training`, `breaks`. Youth: `dream`, `social`, `meaningful`, `movements`, `prep`, `recreation`, `youth-general`. Each has color hex + display_order.
- **Event** ([events.ts](src/lib/events.ts), [supabase.ts](src/lib/supabase.ts)) — id, name, description, category_id, start/end month (1–12), start/end day (nullable), year, location, age_groups (TEXT[]), responsible, registration_link, notes, status (`draft|published|cancelled`), created_by, timestamps.
- **AppUser** ([auth.ts](src/lib/auth.ts)) — id, email, full_name, role (`admin|staff`), department (`education|youth|null`), active (gates approval), avatar_url, last_login_at. Session in `localStorage["ofakim-session"]`.
- **Infrastructure** ([infrastructure.ts](src/lib/infrastructure.ts)) — venues: name, type, address, contact, capacity, age_range, active.
- **AuditEntry** — user_name, event_id/name, action (`create|update|delete`), department, details (JSONB).
- **ParentProfile** ([parent.ts](src/lib/parent.ts)) — localStorage only: familyName, neighborhood, children (name+grade), interests, notification prefs.
- **Holiday** ([data.ts](src/lib/data.ts)) — 16 Jewish holidays/vacations (`holiday|memorial|vacation`).
- **Campus** ([campuses.ts](src/lib/campuses.ts)) — 30 extracurricular programs (instructors + skills) used by the bot for recommendations.
- **Age groups** — `גן`, `0-3`, `3-6`, `א-ו`, `ז-ט`, `י-יב`, `צוות`, `מדריכים`.

## Database (`src/lib/schema*.sql`)

Tables: `categories`, `events`, `users`, `infrastructures`, `audit_log`. RLS in [schema-rls.sql](src/lib/schema-rls.sql) — staff see own dept, admins see all. Realtime publications on `events` and `users` (notification bell + Gantt sync).

## Auth & Roles

- **admin** → `/admin/*`, sees [NotificationBell](src/components/v3/NotificationBell.tsx) (realtime pending-registration count)
- **staff** → `/education` or `/youth` based on `department`; CRUD events in own dept
- **public** → `/luach`, `/luach/onboarding`; no login
- New user → registers inactive → admin approves in `/admin/users`. Bell updates via Supabase `postgres_changes` on `users`.

## V3 Design System ([src/components/v3/](src/components/v3))

- [TopBar.tsx](src/components/v3/TopBar.tsx) — unified header on every page; variants: `neutral|edu|youth|parent|admin`; Ofakim + Ofaktivi logos
- [NotificationBell.tsx](src/components/v3/NotificationBell.tsx) — admin-only, realtime pending-user dropdown
- [Tag.tsx](src/components/v3/Tag.tsx) — badge/label with dot, live indicator, color variants

## Conventions

- All UI Hebrew, `dir="rtl"`, `lang="he"` set in [layout.tsx](src/app/layout.tsx)
- Dept color tokens in `globals.css`: `--edu*`, `--youth*`, `--parent*`
- Don't add features beyond the request — no speculative abstractions
- Don't add comments unless the *why* is non-obvious
- New page → wrap in `<TopBar variant=…>`; don't roll a custom header

## Env

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=        # optional — bot falls back to regex if absent
```

## Scripts

`npm run dev` · `npm run build` · `npm run lint`
