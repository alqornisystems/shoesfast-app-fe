# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Shoesfast frontend — the admin panel for a shoe-care/repair business, built with **Next.js 16 (App Router) + React 19 + TypeScript**. It is a pure client-rendered SPA-style admin: it talks to the separate Laravel API (`../shoesfast-app-be`) over REST with a bearer token. All UI copy is in **Indonesian**, and route folder names use Indonesian domain terms (`pesanan` = orders, `pelanggan` = customers, `pengerjaan` = treatments/work, `pengiriman` = sends/delivery, `pembayaran` = payments, `laporan-*` = reports).

## Commands

```bash
npm run dev      # next dev, http://localhost:3000
npm run build    # next build (production)
npm start        # serve the production build
npm run lint     # eslint (eslint-config-next, core-web-vitals + typescript)
```

There are no unit tests. `npm run build` (which type-checks) and `npm run lint` are the gates.

## Environment

- **`NEXT_PUBLIC_API_URL`** — base URL of the backend API. For local dev, copy `.env.example` → `.env.local` (sets `http://localhost:8000`); must be set in Vercel for production. **Gotcha:** `src/lib/api.ts` falls back to `http://localhost:8000` if unset, but ~24 report/data pages read `process.env.NEXT_PUBLIC_API_URL` **directly with no fallback** (raw `fetch` instead of the `api` client). Without `.env.local` those pages fetch `undefined/api/...` and fail to load, even though login (which uses `api.ts`) works. After changing `.env.local`, restart `next dev` — `NEXT_PUBLIC_*` vars are inlined at startup.
- Deploys to **Vercel** (`vercel.json`, region `sin1`). See `DEPLOYMENT.md` for the full checklist; `deploy.sh` / `deploy-prepare.sh` are helper scripts.
- Backend must have this app's origin in its `FRONTEND_URL` / CORS config for auth to work.

## Architecture

### API client — `src/lib/api.ts`

The single gateway to the backend. `api.get/post/put/delete<T>(path, ...)` wrap `fetch`:

- Reads the bearer token from `localStorage["sf_token"]` and sends `Authorization: Bearer …`.
- On a **401 for any non-`/auth/` path**, it auto-clears the token/user and hard-redirects to `/login`.
- On any non-OK response it throws `{ status, ...json }` — catch and read `error.status` (see `auth-context` for the pattern; only treat 401 as "logged out", keep the session on 500/network errors).
- Paths must include the `/api` prefix (e.g. `api.get("/api/auth/me")`) — the client does not add it.

### Auth & branch context — `src/contexts/auth-context.tsx`

`AuthProvider` (wired in `src/app/layout.tsx`) is the single source of truth for the session. Use the `useAuth()` hook to get `{ user, branch, loading, login, logout, switchBranch, refreshBranch }`.

- **Login is by phone + password** (`login(phone, password, rememberMe)`), not email.
- Session persists in `localStorage`: `sf_token`, `sf_expires_at`, `sf_user`, `sf_remember`. On mount it restores by calling `/api/auth/me`.
- **Sanctum tokens expire** (backend: ~1 day normally, ~30 days with "remember me"). Login/refresh responses include `expires_at`. The provider runs a **sliding-session refresh**: a timer calls `POST /api/auth/refresh` ~5 min before expiry (and on tab refocus if inside that window), swapping the token so an active user is never bounced to `/login` mid-work. If refresh fails, the expired token yields a 401 that `api.ts` turns into a logout. When adding auth flows, keep `sf_expires_at` in sync with the token.
- **Multi-branch (multi-tenant)** mirrors the backend: `branch` holds `{ active_id, active_name, can_switch }`. A super admin can `switchBranch(id)` (persisted server-side); the `<BranchSwitcher>` in the admin header drives this. After switching branches, data must be re-fetched.

### Routing & layout

- App Router under `src/app`. Two route groups: `login/` (public) and **`(admin)/`** (everything else, one folder per feature).
- **`src/app/(admin)/layout.tsx`** is the auth gate + chrome: it blocks on `useAuth().loading`, redirects to `/login` when there's no user, and renders the sidebar (`<AppSidebar>`), branch switcher, breadcrumb header, and the `sonner` `<Toaster>`. Anything under `(admin)/` is authenticated.
- `src/app/layout.tsx` (root) wraps everything in `<AuthProvider>` + `<NavigationProgress>` (nprogress top bar). `lang="id"`.

### Page convention — thin `page.tsx` + `"use client"` client component

Most feature routes split into two files, e.g. `pelanggan/page.tsx` (a trivial server component) that renders `pelanggan/customer-client.tsx` (the `"use client"` component holding all state, data-fetching, and CRUD). **Follow this pattern** when adding a feature: keep `page.tsx` a one-line wrapper and put interactive logic in a co-located `*-client.tsx`.

### UI & styling

- **shadcn/ui** (`components.json`, "new-york" style, `neutral` base, RSC on) with primitives in `src/components/ui`. Add components with the shadcn CLI; import via the `@/components/ui/*` alias.
- **Tailwind CSS v4** (config-less, `@tailwindcss/postcss`); global styles + theme tokens in `src/app/globals.css`. `cn()` merge helper lives in `src/lib/utils.ts`.
- Icons: **lucide-react**. Toasts: **sonner**. Dialogs/alerts: **sweetalert2**. Path alias `@/*` → `src/*`.
- Shared app components in `src/components` (non-`ui/`): `app-sidebar`, `branch-switcher`, `map-picker` / `attendance-map` (Leaflet), `report-export-buttons`, `report-pagination`, `error-boundary`, `fullscreen-loader`, `under-construction`.

### Reports pattern (`laporan-*`)

New report pages should be built from two reusable primitives instead of re-implementing the boilerplate (date range, fetch, header, loading/empty):

- **`useReport<T>({ endpoint })`** (`src/hooks/use-report.ts`) — owns the start/end date range (defaults to the current month), converts it to the query params the backend expects (`dateParam: "timestamp"` unix seconds by default, or `"date"`), fetches through the **`api` client** (auth token + base-URL fallback + 401 handling — do NOT use raw `fetch`/`process.env` here), and returns `{ data, loading, startDate, endDate, setStartDate, setEndDate, refetch }`.
- **`<ReportShell>`** (`src/components/report-shell.tsx`) — the standard chrome: header + auto-wired export (`onExportExcel`/`onExportPDF` → `<ReportExportButtons>`) + Print button, the date-range filter card, and loading/empty states around `children`. Spread the `useReport` result into it and pass `hasData`.

Canonical example: **`laporan-penjualan/page.tsx`** (went from ~300 lines of boilerplate to a thin page). Export helpers stay in `src/lib/export-utils.ts` (Excel) and `src/lib/pdf-utils.ts` (jsPDF); `<ReportPagination>` for paging; `formatCurrency`/`formatDate` from `src/lib/utils.ts`. The other `laporan-*` pages still use the old raw-`fetch` style and can be migrated to this pattern incrementally.

## Conventions

- Client components need `"use client"` at the top of the file (data-fetching, hooks, `localStorage`, `useAuth`).
- New API calls go through `api` from `@/lib/api` — never call `fetch` directly, so token handling and 401 logout stay centralized.
- Keep UI copy in Indonesian to match the rest of the app.
