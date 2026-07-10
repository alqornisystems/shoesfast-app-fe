# UI Patterns

Canonical page archetypes for the Shoesfast admin. When adding or editing a page, find its
archetype here and match the referenced pattern — don't invent a new shape. The essentials of
each are also summarized in the root `CLAUDE.md` (auto-loaded every session); these files hold the
full annotated templates.

| Archetype | Pattern doc | Canonical file |
|---|---|---|
| **List / master** (table + search + pagination + CRUD) | [`list-page.md`](./list-page.md) | `app/(admin)/pesanan/order-client.tsx` |
| **Report** (`laporan-*`, date range + export) | [`report-page.md`](./report-page.md) | `app/(admin)/laporan-penjualan/page.tsx` |
| **Form** (create / edit — dialog or full-page) | [`form.md`](./form.md) | `app/(admin)/pelanggan/customer-client.tsx` |

The layer underneath all three — how they talk to the backend:

| Concern | Pattern doc | Source |
|---|---|---|
| **Data layer** (API client, auth/session, response shapes, utils) | [`data-layer.md`](./data-layer.md) | `lib/api.ts`, `contexts/auth-context.tsx`, `lib/*` |

Building-block idioms a new page reaches for:

| Idiom | Pattern doc | Source |
|---|---|---|
| **Navigation & routes** — make a new page reachable (sidebar, roles, folders) | [`navigation.md`](./navigation.md) | `components/app-sidebar.tsx` |
| **Image upload** (base64 data URL in the payload) | [`image-upload.md`](./image-upload.md) | `pelanggan/customer-client.tsx` |
| **Status badge** (integer status → label/color map) | [`status-badge.md`](./status-badge.md) | `pesanan/order-client.tsx` |
| **Branch scoping · Tabs · Map picker** | [`branch-tabs-map.md`](./branch-tabs-map.md) | `send-client.tsx`, `map-picker.tsx` |

Cross-cutting rules that apply to **every** archetype:

- Thin `page.tsx` server component → co-located `"use client"` `*-client.tsx` for interactive logic.
- All backend calls go through the `api` client from `@/lib/api` (never raw `fetch`/`process.env`);
  paths include the `/api` prefix.
- **Null-safe relation access** — `row.customer?.name ?? "-"`, never `row.customer.name`.
- Indonesian UI copy; `formatCurrency` / `formatDate` from `@/lib/utils`.
- Legacy backend shapes: unix-second timestamps, Laravel paginator (`data`/`current_page`/…),
  422 validation errors as `{ errors: Record<string, string[]> }`.
