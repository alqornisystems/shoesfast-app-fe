# Data Layer Pattern (API, auth & utilities)

How every page talks to the Laravel backend. This is the layer under the
[list](./list-page.md) / [report](./report-page.md) / [form](./form.md) patterns.

**Source:** `src/lib/api.ts` · `src/contexts/auth-context.tsx` · `src/hooks/use-report.ts` · `src/lib/*`

---

## The 8 rules

1. **Always go through the `api` client** (`@/lib/api`) — `api.get/post/put/delete<T>(path, body?, opts?)`.
   Never call `fetch` directly and never read `process.env.NEXT_PUBLIC_API_URL` yourself. The client
   centralizes the base URL, JSON headers, the bearer token, and 401 handling; raw `fetch` bypasses
   all of it (this is the bug behind the ~24 legacy report pages that fetch `undefined/api/...`).

2. **Paths include the `/api` prefix** and are passed whole: `api.get("/api/orders?page=1")`. The
   client does **not** add it.

3. **Auth is automatic.** The client reads `localStorage["sf_token"]` and sends
   `Authorization: Bearer …`. You don't attach tokens by hand. Session lifecycle (login, restore,
   sliding refresh, branch) is owned by `AuthProvider` — read it via `useAuth()`, don't touch
   `sf_token` directly except through that context.

4. **401 = auto-logout, handled for you.** On a 401 for any non-`/auth/` path the client clears the
   token/user and hard-redirects to `/login`. Do **not** write your own "redirect on 401" logic.

5. **Errors throw `{ status, ...json }`.** Wrap calls in `try/catch` and branch on `err.status`.
   Treat **only 401** as "logged out"; keep the session on 500 / network errors. For forms, read the
   Laravel **422** shape `err.errors` (`Record<string, string[]>`) and map back to fields.

6. **Know the response shapes** (legacy backend — see below): paginated list, single resource, or a
   report aggregate. Read them defensively with `?? []` / `?? 0` fallbacks.

7. **Backend data conventions.** Timestamps are **unix seconds** (multiply by 1000 for `Date`);
   soft-deleted rows are filtered server-side (`is_deleted`), so a related object can still come back
   `null` → render null-safe. Money is integer rupiah.

8. **Format with shared helpers**, never re-declare: `formatCurrency`, `formatDate`, `cn` from
   `@/lib/utils`; export/print via `@/lib/export-utils`, `@/lib/pdf-utils`, `@/lib/invoice-utils`.

---

## Calling the API

```tsx
import { api } from "@/lib/api"

// list (Laravel paginator)
const res = await api.get<any>(`/api/orders?page=${page}&per_page=15&search=${q}`)
// res.data, res.current_page, res.last_page, res.per_page, res.total, res.from, res.to

// single resource
const order = await api.get<Order>(`/api/orders/${id}`)

// create / update / delete
await api.post("/api/customers", payload)
await api.put(`/api/customers/${id}`, payload)
await api.delete(`/api/customers/${id}`)
```

### Error handling

```tsx
try {
  await api.post("/api/customers", payload)
} catch (err: unknown) {
  const e = err as { status?: number; message?: string; errors?: Record<string, string[]> }
  if (e.errors) {
    // 422 validation → map to field errors
    const fieldErrs: Record<string, string> = {}
    Object.keys(e.errors).forEach((k) => { fieldErrs[k] = e.errors![k][0] })
    setErrors(fieldErrs)
  } else {
    toast.error(e.message || "Terjadi kesalahan")   // 500 / network — keep the session
  }
}
```

> The `api` client already redirects to `/login` on 401, so you never handle that case yourself.

### Response shapes

| Kind | Shape |
|---|---|
| Paginated list | `{ data: T[], current_page, last_page, per_page, total, from, to }` |
| Single resource | the object directly (`{ id, code, … }`), relations may be `null` |
| Report aggregate | `{ summary: {...}, rows: [...] }` — see [report-page.md](./report-page.md) |
| Validation error (422) | `{ message, errors: Record<string, string[]> }` (thrown, not returned) |

---

## Session & branch — `useAuth()`

```tsx
const { user, branch, loading, login, logout, switchBranch, refreshBranch } = useAuth()
```

- Login is **phone + password**: `login(phone, password, rememberMe)`.
- Gate on `loading` before rendering authed UI (the `(admin)/layout.tsx` already does this globally).
- **Multi-branch:** `branch = { active_id, active_name, can_switch }`. After `switchBranch(id)`,
  **re-fetch** all data — the backend now scopes to a different branch (`projects_id`). The
  `<BranchSwitcher>` in the admin header drives this.
- The provider auto-refreshes the Sanctum token before expiry; keep `sf_expires_at` in sync if you
  add an auth flow. Don't read/write `sf_*` localStorage keys outside the context.

---

## Utility libraries

| Import | Use |
|---|---|
| `@/lib/utils` | `formatCurrency(amount)` (IDR), `formatDate(unixSeconds, fmt?)`, `cn(...)` class merge |
| `@/lib/export-utils` | `exportTableToExcel(rows, columns, filename)`, `handlePrint(title)`, `formatCurrencyForExport` / `formatDateForExport` / `formatPercentForExport` |
| `@/lib/pdf-utils` | `downloadReportPDF(...)`, `generateReportPDFWithSummary(...)` / `downloadReportPDFWithSummary(...)` (jsPDF + autotable) |
| `@/lib/invoice-utils` | `generateInvoicePDF(data)`, `downloadInvoicePDF(data)` for order invoices |

For report pages, the `useReport` hook already wraps the `api` client + date-range → query-param
conversion — use it instead of calling `api.get` in a report by hand (see
[report-page.md](./report-page.md)).
