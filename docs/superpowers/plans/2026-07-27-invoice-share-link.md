# Invoice Share Link (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the client-side jsPDF invoice download with a public, token-addressed invoice page at `/invoice/<token>` that shows each item's photo (click to enlarge) and per-treatment pricing, plus a "Salin Link" button in the admin payments page.

**Architecture:** A new route `src/app/invoice/[token]/` sits as a sibling of `login/`, outside the `(admin)` route group, so it never passes the auth gate in `(admin)/layout.tsx`. `page.tsx` is an async server component that reads `GET /api/public/invoice/{token}` with plain `fetch` + `cache: "no-store"` (deliberately bypassing the `api` client, which is localStorage/401-redirect bound) and branches on 200 / 404 / 410. The only `"use client"` file in the route is `invoice-photo.tsx`, which owns the photo and its full-screen lightbox — that component is the seam where the future 360-spin spec plugs in.

**Tech Stack:** Next.js 16 App Router (async `params`), React 19 server components, TypeScript (strict), Tailwind CSS v4, shadcn/ui (`Button` on the admin side), lucide-react icons, sonner toasts, `formatCurrency` / `formatDate` / `waLink` / `cn` from `@/lib/utils`.

## Pattern compliance

Audited against `docs/patterns/README.md` ("Cross-cutting rules that apply to every archetype"), `data-layer.md`, `status-badge.md`, and `navigation.md`. **Do not add a new pattern doc for the public-page archetype** — one page does not justify one.

| Pattern rule | Where it is satisfied |
|---|---|
| **status-badge.md** — one module-scope label map per feature, read through with a fallback | `STATUS_LABELS` in Task 2, a `Record<string, { label; color }>` carrying the exact labels and hues from the deleted `invoice-utils.ts` (LUNAS green / CICILAN blue / BELUM BAYAR red), read as `STATUS_LABELS[data.payment_status]?.label ?? "-"`. `payment_status` is a **string** enum here, not the usual integer, but the rule is unchanged. No status conditionals anywhere in the JSX. |
| **data-layer.md** — all calls go through the `api` client | Held everywhere except the one page the spec sanctions; Task 6 records that exception in the doc itself, names the exact file, gives the reason, and states the admin "Salin Link" call still uses `api`. |
| **Thin `page.tsx` → co-located `*-client.tsx`** | Held: `page.tsx` is a server component doing fetch + `generateMetadata` + markup with zero state and zero event handlers; every interactive bit (`useState`, `useEffect`, `onClick`, Escape key) lives in the co-located `invoice-photo.tsx`. |
| **Indonesian copy / shared formatters / null-safe relations / unix seconds** | Every code block in Tasks 1-4: all strings Indonesian, `formatCurrency` + `formatDate` imported from `@/lib/utils` and never re-declared, `?? "-"` on every relation field and `?? []` on every array, and all timestamps passed to `formatDate` as raw unix seconds. |
| **navigation.md** — *not applicable* | A page is unreachable until registered in `navGroups`, but that rule governs `(admin)/` pages. `/invoice/[token]` is public: no session, no sidebar, no breadcrumb, reached only by the link an admin pastes into WhatsApp. It is deliberately **not** in `app-sidebar.tsx`, and adding it would expose a dead admin link. Not a missed step. |
| **list-page.md / form.md / report-page.md** — *not applicable* | The public page is none of the three archetypes: no table, no search, no pagination, no `sessionStorage` position, no form, no date range. Task 4's edits stay inside `pembayaran`, which already follows list-page.md, and change only the action button. |
| **Pre-existing deviation, left alone** | `payment-client.tsx:360-374` declares its own local `formatDate` / `formatCurrency` instead of importing them from `@/lib/utils`. That predates this feature and none of the code this plan adds uses them. Fixing it is a separate cleanup — do **not** bundle it here. |

## Global Constraints

- All UI copy is in **Indonesian**. No English strings reach the screen.
- `formatCurrency`, `formatDate`, `waLink`, `cn` are imported from `@/lib/utils` — **never** re-declared per page.
- Null-safe relation access everywhere: `data.customer?.name ?? "-"`, never a bare `data.customer.name`. Arrays: `data.items ?? []`.
- The public invoice page is the **only** file in the repo allowed to call `fetch` instead of the `api` client. The reason is written as a code comment in the file. The admin "Salin Link" call goes through the `api` client like everything else.
- The public route lives at `src/app/invoice/[token]/` — a sibling of `login/`, **outside** the `(admin)` group. Do not add it to `navGroups` in `app-sidebar.tsx`; it is not an admin page.
- Backend payload field names are exact and must be used verbatim: `code`, `date`, `due_date`, `payment_status`, `branch.name`, **`branch.whatsapp`**, `customer.{name,phone,email,address}`, `items[].{name,photo,price,discount}`, `items[].treatments[].{name,price}`, `total_price`, `total_paid`, `credit`, `payments[].{date,nominal,note}`. Note the branch contact key is `whatsapp`, **not** `phone` — the backend sources it as `whatsapp ?: phone` so branches that never set a WhatsApp number fall back to their landline. `customer.phone` keeps its own name and is unrelated.
- HTTP contract from the backend spec: **200** = payload, **404** = `{"message":"Invoice tidak ditemukan"}`, **410** = `{"message":"Link invoice sudah kedaluwarsa","branch":{"name":…,"whatsapp":…}}`. The 410 body **always** carries the `branch` object; its fields can be `null` only when the project row itself was deleted — that is the one case the expired view still guards against.
- Timestamps are **unix seconds** (`date`, `due_date`, `payments[].date`). Money is **integer rupiah**.
- Status rendering follows `docs/patterns/status-badge.md`: **one** module-scope `STATUS_LABELS` map holding label + color, always read with a fallback (`STATUS_LABELS[status]?.label ?? "-"`), never `if (status === "paid")` scattered through JSX. Labels and hues carry over verbatim from the deleted `invoice-utils.ts`: `paid` → "LUNAS" green, `partial` → "CICILAN" blue, `unpaid` → "BELUM BAYAR" red.
- Item card layout only — no table. Mobile-first, one layout at every breakpoint. The "Diskon" row renders **only** when `item.discount > 0`.
- **No 360-degree photo work.** That is a separate future spec. `invoice-photo.tsx` gets a comment saying it is the seam; build only the lightbox.
- **Verification gates are `npm run build` (type-checks) and `npm run lint`. There is no test runner and none may be added** (no vitest, no jest, no playwright).
- **Lint baseline is already red**: `npm run lint` currently reports 310 problems (162 errors, 148 warnings) in pre-existing files. `npm run lint` therefore is **not** a pass/fail gate — the check is "no new errors or warnings whose file path is one you touched". `npm run build` **is** a pass/fail gate and is currently green.
- **No dependency is removed.** Both `jspdf` and `jspdf-autotable` stay installed — `src/lib/pdf-utils.ts` imports `autoTable from 'jspdf-autotable'` (line 2), calls it at lines 151 and 326, and augments the `jspdf` module type with it at lines 6-8. `package.json` is not touched. The only deletion is `src/lib/invoice-utils.ts`.

---

## File Structure

| Action | Path | Single responsibility |
|---|---|---|
| Create | `src/app/invoice/[token]/invoice-photo.tsx` | `"use client"` — renders one item photo, opens a full-screen lightbox on click, placeholder when `photo` is null. The 360-spin seam. |
| Create | `src/app/invoice/[token]/page.tsx` | Async server component — fetches the public payload, owns all payload types, renders the invoice / expired / error views, exports `generateMetadata`. |
| Create | `src/app/invoice/[token]/not-found.tsx` | Indonesian 404 boundary for `notFound()` thrown by `page.tsx`. |
| Modify | `src/app/(admin)/pembayaran/payment-client.tsx` | Swap `handlePrintInvoice` (PDF download) for `handleCopyInvoiceLink` (POST + clipboard) at both button sites. |
| Delete | `src/lib/invoice-utils.ts` | The jsPDF invoice builder — replaced entirely by the public page. |
| Modify | `docs/patterns/data-layer.md` | Drop the `@/lib/invoice-utils` references; document the one sanctioned raw-`fetch` exception. |

---

### Task 1: Photo component with lightbox

**Files:**
- Create: `src/app/invoice/[token]/invoice-photo.tsx`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: named export `InvoicePhoto`, props `{ photo: string | null; name: string }`. Task 2 imports it as `import { InvoicePhoto } from "./invoice-photo"`.

- [ ] **Step 1: Create the feature branch**
```bash
cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && git checkout -b feat/invoice-share-link
```

- [ ] **Step 2: Write `src/app/invoice/[token]/invoice-photo.tsx`**
```tsx
"use client"

import { useEffect, useState } from "react"
import { ImageOff, X } from "lucide-react"

/**
 * Foto satu item invoice, dengan lightbox layar penuh saat diklik.
 *
 * Ini satu-satunya berkas "use client" di halaman invoice publik.
 *
 * TITIK SAMBUNG SPEC LANJUTAN: saat spec "putaran 360 derajat" dikerjakan, cukup isi
 * komponen ini yang ditukar dengan viewer spin — page.tsx dan sisa halaman invoice tidak
 * perlu disentuh. Versi ini SENGAJA hanya lightbox; 360 tidak termasuk lingkup spec ini.
 */
export function InvoicePhoto({ photo, name }: { photo: string | null; name: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open])

  if (!photo) {
    return (
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border bg-muted sm:h-28 sm:w-28">
        <ImageOff className="h-6 w-6 text-muted-foreground/60" />
        <span className="sr-only">Tidak ada foto</span>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Klik untuk memperbesar"
        className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border sm:h-28 sm:w-28"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={name} className="h-full w-full object-cover" loading="lazy" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${name}`}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup foto"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={name} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Verify it type-checks**
Run: `cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && npx tsc --noEmit`
Expected: exits 0, no output. Specifically no error mentioning `invoice-photo.tsx`. (`npm run build` is not useful yet — nothing imports this file, so Next will not compile it into a route.)

- [ ] **Step 4: Verify lint is clean for this file**
Run: `cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && npx eslint "src/app/invoice/[token]/invoice-photo.tsx"`
Expected: exits 0 with no output. If `@next/next/no-img-element` still fires, the `eslint-disable-next-line` comment is misplaced — it must sit on the line directly above each `<img`.

- [ ] **Step 5: Commit**
```bash
cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && git add "src/app/invoice/[token]/invoice-photo.tsx" && git commit -m "feat(invoice): photo component with fullscreen lightbox for public invoice" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Public invoice page (server component)

**Files:**
- Create: `src/app/invoice/[token]/page.tsx`

**Interfaces:**
- Consumes: `InvoicePhoto` from `./invoice-photo` with props `{ photo: string | null; name: string }` (Task 1).
- Produces: exported types `InvoiceTreatment`, `InvoiceItem`, `InvoicePaymentRow`, `InvoiceData`; default export `InvoicePage`; named export `generateMetadata`. Task 3 relies on this file calling `notFound()`.

- [ ] **Step 1: Write `src/app/invoice/[token]/page.tsx`**
```tsx
import { cache } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { cn, formatCurrency, formatDate, waLink } from "@/lib/utils"
import { InvoicePhoto } from "./invoice-photo"

export type InvoiceTreatment = {
  name: string | null
  price: number | null
}

export type InvoiceItem = {
  name: string | null
  photo: string | null
  price: number | null
  discount: number | null
  treatments: InvoiceTreatment[] | null
}

export type InvoicePaymentRow = {
  date: number
  nominal: number | null
  note: string | null
}

export type InvoiceData = {
  code: string | null
  date: number
  due_date: number | null
  payment_status: "paid" | "partial" | "unpaid"
  branch: { name: string | null; whatsapp: string | null } | null
  customer: {
    name: string | null
    phone: string | null
    email: string | null
    address: string | null
  } | null
  items: InvoiceItem[] | null
  total_price: number
  total_paid: number
  credit: number
  payments: InvoicePaymentRow[] | null
}

/**
 * status = 200 | 404 | 410 | 500-an | 0 (gagal jaringan).
 * `branch` hanya terisi pada respons galat: body 410 selalu membawa objek branch supaya
 * halaman kedaluwarsa bisa menampilkan nomor WhatsApp cabang (`branch.whatsapp`). Pada 200,
 * branch dibaca dari `data.branch` seperti biasa.
 */
type FetchResult = { status: number; data: InvoiceData | null; branch: InvoiceData["branch"] }

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

/**
 * SENGAJA tidak memakai klien `api` dari "@/lib/api".
 *
 * Klien itu membaca token dari localStorage dan hard-redirect ke /login pada tiap 401 —
 * dua-duanya salah untuk halaman publik tanpa login, dan localStorage tidak ada sama sekali
 * di server. Ini SATU-SATUNYA pengecualian dari aturan "semua panggilan lewat `api`" di
 * CLAUDE.md; alasannya ditulis di sini supaya tidak dikira kelalaian. Tombol "Salin Link" di
 * halaman admin tetap lewat klien `api` biasa.
 *
 * `cache: "no-store"` supaya status pembayaran selalu mutakhir; `cache()` dari React membuat
 * generateMetadata dan komponen halaman berbagi satu panggilan, bukan dua.
 */
const getInvoice = cache(async (token: string): Promise<FetchResult> => {
  try {
    const res = await fetch(`${BASE_URL}/api/public/invoice/${encodeURIComponent(token)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      const branch = (body as { branch?: InvoiceData["branch"] } | null)?.branch ?? null
      return { status: res.status, data: null, branch }
    }
    return { status: 200, data: body as InvoiceData, branch: null }
  } catch {
    return { status: 0, data: null, branch: null }
  }
})

/**
 * docs/patterns/status-badge.md: satu peta label per fitur, di module scope, selalu dibaca
 * dengan fallback. Di sini kuncinya string (bukan integer seperti kebanyakan status backend).
 * Label dan warnanya dibawa apa adanya dari invoice-utils.ts yang dihapus.
 */
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  paid: { label: "LUNAS", color: "bg-green-500/10 text-green-700 border-green-200" },
  partial: { label: "CICILAN", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  unpaid: { label: "BELUM BAYAR", color: "bg-red-500/10 text-red-700 border-red-200" },
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="space-y-3 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const { data } = await getInvoice(token)
  if (!data) return { title: "Invoice · Shoesfast" }
  return {
    title: `Invoice ${data.code ?? "-"} · Shoesfast`,
    description: `${data.customer?.name ?? "Pelanggan"} — Total ${formatCurrency(data.total_price ?? 0)}`,
  }
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { status, data, branch } = await getInvoice(token)

  if (status === 404) notFound()

  if (status === 410) {
    // Body 410 selalu membawa objek branch, dan `whatsapp` sudah di-fallback ke nomor telepon
    // cabang oleh backend. Nilainya hanya null kalau baris project-nya sendiri sudah terhapus —
    // itu satu-satunya alasan tautan WA di bawah masih dibungkus kondisi.
    const wa = waLink(branch?.whatsapp)
    return (
      <Notice title="Link invoice sudah kedaluwarsa">
        <p>
          Silakan hubungi {branch?.name ?? "Shoesfast"} untuk meminta link invoice yang baru.
        </p>
        {wa ? (
          <a href={wa} className="inline-block font-medium text-green-600 underline">
            Hubungi via WhatsApp {branch?.whatsapp}
          </a>
        ) : null}
      </Notice>
    )
  }

  if (!data) {
    return (
      <Notice title="Invoice tidak dapat dimuat">
        <p>Terjadi kesalahan saat memuat invoice. Silakan coba lagi beberapa saat lagi.</p>
      </Notice>
    )
  }

  const status = STATUS_LABELS[data.payment_status]
  const items = data.items ?? []
  const payments = data.payments ?? []

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">SHOESFAST</h1>
              <p className="text-sm text-muted-foreground">{data.branch?.name ?? "-"}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tracking-tight text-muted-foreground">INVOICE</p>
              <p className="text-sm">No: {data.code ?? "-"}</p>
              <p className="text-sm text-muted-foreground">
                Tanggal: {data.date ? formatDate(data.date, "dd MMMM yyyy") : "-"}
              </p>
              {data.due_date ? (
                <p className="text-sm text-muted-foreground">
                  Jatuh tempo: {formatDate(data.due_date, "dd MMMM yyyy")}
                </p>
              ) : null}
              <span
                className={cn(
                  "mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                  status?.color ?? "bg-gray-100 text-gray-700 border-gray-200",
                )}
              >
                {status?.label ?? "-"}
              </span>
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Ditagihkan kepada
            </p>
            <p className="mt-1 font-medium">{data.customer?.name ?? "-"}</p>
            <p className="text-sm text-muted-foreground">{data.customer?.phone ?? "-"}</p>
            <p className="text-sm text-muted-foreground">{data.customer?.address ?? "-"}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
            Tidak ada rincian item.
          </div>
        ) : (
          items.map((item, i) => {
            const treatments = item.treatments ?? []
            return (
              <div key={i} className="flex gap-4 rounded-xl border bg-card p-4 shadow-sm">
                <InvoicePhoto photo={item.photo ?? null} name={item.name ?? "Item"} />
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium">{item.name ?? "-"}</p>
                  <div className="mt-2 space-y-1">
                    {treatments.map((t, j) => (
                      <div key={j} className="flex justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{t.name ?? "-"}</span>
                        <span className="tabular-nums">{formatCurrency(Number(t.price) || 0)}</span>
                      </div>
                    ))}
                  </div>
                  {Number(item.discount) > 0 ? (
                    <div className="mt-1 flex justify-between gap-3 text-sm text-red-600">
                      <span>Diskon</span>
                      <span className="tabular-nums">
                        -{formatCurrency(Number(item.discount))}
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-2 flex justify-between gap-3 border-t pt-2 text-sm font-semibold">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatCurrency(Number(item.price) || 0)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="ml-auto max-w-xs space-y-1.5">
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(data.total_price ?? 0)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Terbayar</span>
              <span className="font-medium tabular-nums text-green-600">
                {formatCurrency(data.total_paid ?? 0)}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-t pt-1.5 text-base font-semibold">
              <span>Sisa</span>
              <span
                className={cn(
                  "tabular-nums",
                  (data.credit ?? 0) > 0 ? "text-red-600" : "text-green-600",
                )}
              >
                {formatCurrency(data.credit ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {payments.length > 0 && (
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold">Riwayat Pembayaran</p>
            <div className="mt-3 space-y-2">
              {payments.map((p, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2 text-sm last:border-b-0 last:pb-0"
                >
                  <span className="text-muted-foreground">{p.date ? formatDate(p.date) : "-"}</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(Number(p.nominal) || 0)}
                  </span>
                  <span className="w-full text-xs text-muted-foreground sm:w-auto">
                    {p.note ?? "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="pb-4 text-center text-xs text-muted-foreground">
          Terima kasih atas kepercayaan Anda.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the build compiles the new route**
Run: `cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && npm run build`
Expected: exits 0, and the printed route table contains a line `ƒ /invoice/[token]` marked Dynamic (not Static — `cache: "no-store"` forces dynamic rendering). No TypeScript errors.

- [ ] **Step 3: Verify lint is clean for this file**
Run: `cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && npx eslint "src/app/invoice/[token]/page.tsx"`
Expected: exits 0 with no output.

- [ ] **Step 4: Commit**
```bash
cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && git add "src/app/invoice/[token]/page.tsx" && git commit -m "feat(invoice): public /invoice/[token] page with per-treatment pricing" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Indonesian 404 boundary

**Files:**
- Create: `src/app/invoice/[token]/not-found.tsx`

**Interfaces:**
- Consumes: nothing. Next.js resolves this file automatically as the nearest `not-found` boundary for the `notFound()` call in `src/app/invoice/[token]/page.tsx` (Task 2).
- Produces: default export `InvoiceNotFound` (no props). Nothing imports it directly.

- [ ] **Step 1: Write `src/app/invoice/[token]/not-found.tsx`**
```tsx
export default function InvoiceNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Invoice tidak ditemukan</h1>
        <p className="text-sm text-muted-foreground">
          Link invoice ini tidak dikenal. Pastikan link disalin secara utuh, atau hubungi
          Shoesfast untuk meminta link baru.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**
Run: `cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && npm run build`
Expected: exits 0. The route table still shows `ƒ /invoice/[token]`.
Manual check: with `npm run dev` running and the backend up, open `http://localhost:3000/invoice/tokenpalsu123` in the browser. The page must show the Indonesian card reading "Invoice tidak ditemukan" — **not** Next.js's default English "This page could not be found." Response status in the Network tab must be 404.

- [ ] **Step 3: Commit**
```bash
cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && git add "src/app/invoice/[token]/not-found.tsx" && git commit -m "feat(invoice): Indonesian not-found boundary for unknown invoice tokens" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Admin "Salin Link" button

**Files:**
- Modify: `src/app/(admin)/pembayaran/payment-client.tsx:4` (icon imports)
- Modify: `src/app/(admin)/pembayaran/payment-client.tsx:6` (drop the `invoice-utils` import)
- Modify: `src/app/(admin)/pembayaran/payment-client.tsx:67-77` (delete the now-dead `OrderItemRow` / `PaymentRow` types)
- Modify: `src/app/(admin)/pembayaran/payment-client.tsx:152` (rename the spinner state)
- Modify: `src/app/(admin)/pembayaran/payment-client.tsx:154-203` (replace `handlePrintInvoice`)
- Modify: `src/app/(admin)/pembayaran/payment-client.tsx:545-559` (table row action button)
- Modify: `src/app/(admin)/pembayaran/payment-client.tsx:805-819` (detail dialog footer button)

**Interfaces:**
- Consumes: `api` from `@/lib/api`; the backend response `{ url: string; expires_at: number }` from `POST /api/orders/{id}/invoice-link`; the existing local `Payment` type (fields `id`, `code`, `payment_status`, `credit`, …) — unchanged by this task.
- Produces: `handleCopyInvoiceLink(order: Payment): Promise<void>` and the state pair `copyingId` / `setCopyingId` (`number | null`), both file-local. Nothing outside this file consumes them.

> Line numbers above are from the file as it stands today; they shift as you apply edits. Match on the quoted `old` text, not on the line number.

- [ ] **Step 1: Swap the icon import — replace `Printer` with `Link2`**
Find this line (line 4) and replace it:
```tsx
import { Search, Loader2, Plus, ChevronLeft, ChevronRight, HandCoins, AlertCircle, CheckCircle2, Clock, Calendar, Upload, X, Printer } from "lucide-react"
```
with:
```tsx
import { Search, Loader2, Plus, ChevronLeft, ChevronRight, HandCoins, AlertCircle, CheckCircle2, Clock, Calendar, Upload, X, Link2 } from "lucide-react"
```

- [ ] **Step 2: Delete the `invoice-utils` import**
Delete this line (line 6) entirely:
```tsx
import { downloadInvoicePDF } from "@/lib/invoice-utils"
```

- [ ] **Step 3: Delete the two now-dead payload types**
Delete this whole block (lines 67-77) — nothing else in the file references `OrderItemRow` or `PaymentRow` once `handlePrintInvoice` is gone:
```tsx
type OrderItemRow = {
  name?: string | null
  price?: number | string | null
  treatments?: { name?: string | null }[]
}

type PaymentRow = {
  date: number
  nominal?: number | string | null
  note?: string | null
}
```

- [ ] **Step 4: Rename the spinner state**
Replace this line (line 152):
```tsx
  const [printingId, setPrintingId] = useState<number | null>(null)
```
with:
```tsx
  const [copyingId, setCopyingId] = useState<number | null>(null)
```

- [ ] **Step 5: Replace `handlePrintInvoice` with `handleCopyInvoiceLink`**
Replace the whole function (lines 154-203, from `async function handlePrintInvoice(order: Payment) {` through its closing `}`):
```tsx
  async function handleCopyInvoiceLink(order: Payment) {
    setCopyingId(order.id)
    try {
      const res = await api.post<{ url: string; expires_at: number }>(
        `/api/orders/${order.id}/invoice-link`,
      )
      // ponytail: navigator.clipboard hanya tersedia di HTTPS atau localhost. Frontend
      // dideploy ke Vercel yang selalu HTTPS, jadi aman. Kalau kelak panel admin dibuka
      // lewat HTTP polos, panggilan ini melempar dan tombolnya cuma memunculkan toast gagal;
      // fallback document.execCommand("copy") ditambahkan hanya kalau itu benar-benar terjadi.
      await navigator.clipboard.writeText(res.url)
      toast.success("Link invoice disalin")
    } catch {
      toast.error("Gagal membuat link invoice")
    } finally {
      setCopyingId(null)
    }
  }
```

- [ ] **Step 6: Swap the table row action button**
Replace this block (lines 545-559, inside the payments `.map`):
```tsx
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5"
                          title="Cetak Invoice"
                          disabled={printingId === payment.id}
                          onClick={() => handlePrintInvoice(payment)}
                        >
                          {printingId === payment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Printer className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden lg:inline">Invoice</span>
                        </Button>
```
with:
```tsx
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5"
                          title="Salin Link Invoice"
                          disabled={copyingId === payment.id}
                          onClick={() => handleCopyInvoiceLink(payment)}
                        >
                          {copyingId === payment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Link2 className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden lg:inline">Salin Link</span>
                        </Button>
```

- [ ] **Step 7: Swap the detail dialog footer button**
Replace this block (lines 805-819, inside `<DialogFooter>`):
```tsx
            {selectedOrder && (
              <Button
                variant="outline"
                className="gap-1.5"
                disabled={printingId === selectedOrder.id}
                onClick={() => handlePrintInvoice(selectedOrder)}
              >
                {printingId === selectedOrder.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                Cetak Invoice
              </Button>
            )}
```
with:
```tsx
            {selectedOrder && (
              <Button
                variant="outline"
                className="gap-1.5"
                disabled={copyingId === selectedOrder.id}
                onClick={() => handleCopyInvoiceLink(selectedOrder)}
              >
                {copyingId === selectedOrder.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Salin Link
              </Button>
            )}
```

- [ ] **Step 8: Verify no stale references remain**
Run: `cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && grep -n "printingId\|handlePrintInvoice\|downloadInvoicePDF\|Printer\|OrderItemRow\|PaymentRow" "src/app/(admin)/pembayaran/payment-client.tsx"`
Expected: exits 1 with **no output**. Any hit means an edit was missed.

- [ ] **Step 9: Verify the build**
Run: `cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && npm run build`
Expected: exits 0, no TypeScript errors. The route table still lists `○ /pembayaran`.

- [ ] **Step 10: Manual check in the browser**
With the backend running (`php artisan serve`, XAMPP PATH exported) and `npm run dev` up, log into `http://localhost:3000/pembayaran`.
1. On any table row, the last action button must read "Salin Link" with a chain-link icon (`Link2`), not "Invoice" with a printer icon. On a narrow window the label hides and only the icon shows.
2. Click it: a spinner replaces the icon, then a green toast "Link invoice disalin" appears and **no PDF downloads**.
3. Paste the clipboard into the address bar — it must be `<FRONTEND_URL>/invoice/<40-char token>` and render the invoice page.
4. Open the payment detail dialog on the same row; its footer button must also read "Salin Link" and behave identically.
5. Click "Salin Link" a second time on the same order — the copied URL must be **byte-identical** to the first one (the token is stable; only the expiry is refreshed).

- [ ] **Step 11: Commit**
```bash
cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && git add "src/app/(admin)/pembayaran/payment-client.tsx" && git commit -m "feat(pembayaran): replace Cetak Invoice PDF with Salin Link share button" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Delete the PDF invoice path

**Files:**
- Delete: `src/lib/invoice-utils.ts`
- (Explicitly **not** modified: `package.json`, `src/lib/pdf-utils.ts`)

**Interfaces:**
- Consumes: the fact that Task 4 removed the only import of `@/lib/invoice-utils`.
- Produces: nothing. After this task the symbols `generateInvoicePDF`, `downloadInvoicePDF`, `InvoiceData` (the jsPDF one), `InvoiceItem` (the jsPDF one), and `InvoicePayment` no longer exist anywhere in the repo. Note the public page (Task 2) exports its *own* `InvoiceData` / `InvoiceItem` types from `src/app/invoice/[token]/page.tsx` — different shape, different module, no collision.

- [ ] **Step 1: Confirm nothing still imports it**
Run: `cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && grep -rn "invoice-utils" src/`
Expected: exits 1 with no output. If anything prints, Task 4 was not finished — stop and fix that first.

- [ ] **Step 2: Delete the file**
```bash
cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && git rm src/lib/invoice-utils.ts
```

- [ ] **Step 3: Prove `jspdf-autotable` must stay installed**
No dependency is removed by this feature: `src/lib/pdf-utils.ts` (the reports PDF exporter, untouched here) imports and calls `autoTable`. This step is the proof.
Run: `cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && grep -rn "jspdf-autotable\|autoTable" src/`
Expected output — exactly these lines, all in `pdf-utils.ts`, and **no** line from `invoice-utils.ts`:
```
src/lib/pdf-utils.ts:2:import autoTable from 'jspdf-autotable'
src/lib/pdf-utils.ts:5:// Extend jsPDF type to include autoTable
src/lib/pdf-utils.ts:8:    autoTable: typeof autoTable
src/lib/pdf-utils.ts:151:  autoTable(doc, {
src/lib/pdf-utils.ts:326:  autoTable(doc, {
```
Because of these five lines, **do not run `npm uninstall jspdf-autotable`** and do not edit `package.json`. Both `jspdf` and `jspdf-autotable` stay.

- [ ] **Step 4: Verify reports still build and export**
Run: `cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && npm run build`
Expected: exits 0. The route table still lists every `○ /laporan-*` route (`/laporan-penjualan`, `/laporan-pengeluaran`, …). No "Module not found: Can't resolve 'jspdf'" or "'jspdf-autotable'" error.
Manual check: with `npm run dev` up, open `http://localhost:3000/laporan-penjualan`, pick a date range that returns rows, and click the **PDF** export button. A `.pdf` file must download and open with a rendered table — proving the `autoTable` path is intact after the deletion.

- [ ] **Step 5: Commit**
```bash
cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && git commit -m "chore(invoice): delete jsPDF invoice builder, superseded by public invoice page" -m "jspdf and jspdf-autotable stay installed: pdf-utils.ts still uses both for laporan exports." -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Update the data-layer pattern doc

**Files:**
- Modify: `docs/patterns/data-layer.md:40` (util-library bullet)
- Modify: `docs/patterns/data-layer.md:12-15` (rule 1 — add the sanctioned exception)
- Modify: `docs/patterns/data-layer.md:116` (util-library table row)

**Interfaces:**
- Consumes: the deletion of `src/lib/invoice-utils.ts` (Task 5) and the raw-`fetch` exception introduced in `src/app/invoice/[token]/page.tsx` (Task 2).
- Produces: documentation only. No code depends on it.

- [ ] **Step 1: Fix rule 8's util list (line 40)**
Replace:
```markdown
8. **Format with shared helpers**, never re-declare: `formatCurrency`, `formatDate`, `cn` from
   `@/lib/utils`; export/print via `@/lib/export-utils`, `@/lib/pdf-utils`, `@/lib/invoice-utils`.
```
with:
```markdown
8. **Format with shared helpers**, never re-declare: `formatCurrency`, `formatDate`, `cn` from
   `@/lib/utils`; export/print via `@/lib/export-utils`, `@/lib/pdf-utils`.
```

- [ ] **Step 2: Record the one sanctioned raw-`fetch` exception in rule 1 (lines 12-15)**
Replace:
```markdown
1. **Always go through the `api` client** (`@/lib/api`) — `api.get/post/put/delete<T>(path, body?, opts?)`.
   Never call `fetch` directly and never read `process.env.NEXT_PUBLIC_API_URL` yourself. The client
   centralizes the base URL, JSON headers, the bearer token, and 401 handling; raw `fetch` bypasses
   all of it (this is the bug behind the ~24 legacy report pages that fetch `undefined/api/...`).
```
with:
```markdown
1. **Always go through the `api` client** (`@/lib/api`) — `api.get/post/put/delete<T>(path, body?, opts?)`.
   Never call `fetch` directly and never read `process.env.NEXT_PUBLIC_API_URL` yourself. The client
   centralizes the base URL, JSON headers, the bearer token, and 401 handling; raw `fetch` bypasses
   all of it (this is the bug behind the ~24 legacy report pages that fetch `undefined/api/...`).

   **The one sanctioned exception** is `src/app/invoice/[token]/page.tsx`, the public invoice page.
   It is a server component with no logged-in user, so the `api` client is actively wrong there:
   it reads `localStorage` (absent on the server) and hard-redirects to `/login` on 401. It uses
   plain `fetch` with `cache: "no-store"`, and the reason is written as a comment in the file.
   Do not "fix" it. Every other call — including the admin "Salin Link" button — uses `api`.
```

- [ ] **Step 3: Drop the deleted module from the utility table (line 116)**
Delete this row from the "Utility libraries" table:
```markdown
| `@/lib/invoice-utils` | `generateInvoicePDF(data)`, `downloadInvoicePDF(data)` for order invoices |
```

- [ ] **Step 4: Verify no stale doc references remain**
Run: `cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && grep -rn "invoice-utils" docs/patterns/ src/ CLAUDE.md`
Expected: exits 1 with no output. (Hits inside `docs/superpowers/specs/` are expected and must be left alone — a spec is a historical record.)

- [ ] **Step 5: Commit**
```bash
cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && git add docs/patterns/data-layer.md && git commit -m "docs(patterns): drop invoice-utils, document the public invoice fetch exception" -m "Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: End-to-end verification

**Files:**
- Modify: none. This task only runs and observes.

**Interfaces:**
- Consumes: everything from Tasks 1-6, plus a live backend implementing `POST /api/orders/{id}/invoice-link` and `GET /api/public/invoice/{token}` per the backend spec.
- Produces: nothing. Gate before merging.

- [ ] **Step 1: Confirm `.env.local` is set**
Run: `cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && cat .env.local`
Expected: contains `NEXT_PUBLIC_API_URL=http://localhost:8000`. If the file is missing, run `cp .env.example .env.local` and restart `next dev` — `NEXT_PUBLIC_*` vars are inlined at startup.

- [ ] **Step 2: Get a live token from the database**
Run (backend repo, XAMPP on PATH):
```bash
export PATH="/Applications/XAMPP/xamppfiles/bin:$PATH" && mysql -u root shoesfast -e "SELECT id, code, invoice_token, invoice_expires_at FROM orders WHERE invoice_token IS NOT NULL LIMIT 3;"
```
Expected: at least one row with a 40-character `invoice_token`. If the table is empty, press "Salin Link" once in `/pembayaran` (Task 4, Step 10) and re-run.

- [ ] **Step 3: Verify the happy path (200) in the browser**
Open `http://localhost:3000/invoice/<token-from-step-2>` in a normal browser tab (not logged in — use a private window to prove no auth is required).
Confirm all of the following:
1. The page renders — it is **not** redirected to `/login`.
2. Header shows `SHOESFAST`, the branch name, `No: <code>`, `Tanggal: <dd MMMM yyyy>`, and a colored badge reading `LUNAS` (green) / `CICILAN` (blue) / `BELUM BAYAR` (red) matching the order's status in `/pembayaran`.
3. "Ditagihkan kepada" shows the customer name, phone, and address — and for a walk-in order with no customer it shows `-` on all three rather than crashing.
4. One card per item. Each card lists **every treatment on its own row with its own price** (`Deep Clean … Rp 75.000`), then a `Subtotal` row equal to `item.price`.
5. A "Diskon" row appears **only** on items whose `discount` is greater than 0.
6. The totals block shows `Total` / `Terbayar` / `Sisa`, with `Sisa` red when non-zero and green when zero — and the three numbers equal `total_price` / `total_paid` / `credit` shown for that order in `/pembayaran`.
7. "Riwayat Pembayaran" lists each payment's date, nominal, and note; the section is absent entirely when there are no payments.
8. The browser tab title reads `Invoice <code> · Shoesfast`.

- [ ] **Step 4: Verify the photo lightbox**
On the same page:
1. Each item card shows its photo as a rounded square thumbnail; items whose `photo` is `null` show a grey box with an image icon instead of a broken image.
2. Click a photo — a full-screen black overlay opens showing the photo scaled to fit, with an X button top-right.
3. Press **Escape** — the overlay closes.
4. Re-open it and click the dark backdrop — it closes.
5. Re-open it and click the X button — it closes.
6. While the overlay is open, the page behind it must not scroll.

- [ ] **Step 5: Verify the 410 expired path**
Expire the token, then reload:
```bash
export PATH="/Applications/XAMPP/xamppfiles/bin:$PATH" && mysql -u root shoesfast -e "UPDATE orders SET invoice_expires_at = UNIX_TIMESTAMP() - 60 WHERE invoice_token = '<token-from-step-2>';"
```
Reload `http://localhost:3000/invoice/<token>`.
Expected: the card reads "Link invoice sudah kedaluwarsa" with "Silakan hubungi &lt;nama cabang&gt; untuk meminta link invoice yang baru." The invoice contents must **not** be visible. A green "Hubungi via WhatsApp &lt;nomor&gt;" link must be shown — the 410 body always carries `branch`, and `branch.whatsapp` is the project's `whatsapp` column falling back to its `phone` column. Click it: it must open `https://wa.me/62…` with that number, normalized by `waLink` (leading `0` stripped, `62` prefixed). Cross-check the number against `SELECT name, phone, whatsapp FROM projects WHERE id = <order's projects_id>;` — a branch with `whatsapp` set must show the WhatsApp number, one with it null must show the landline.
Then restore it: press "Salin Link" for that order in `/pembayaran` and reload — the invoice must come back with the **same** URL.

- [ ] **Step 6: Verify the 404 path**
Open `http://localhost:3000/invoice/tokenyangtidakada`.
Expected: the Indonesian "Invoice tidak ditemukan" card; the Network tab shows a 404 status for the document request.

- [ ] **Step 7: Verify mobile width**
In DevTools, switch to an iPhone SE viewport (375 px wide) and reload the invoice page.
Expected: no horizontal scrollbar; the item cards stack with the photo on the left and treatment rows on the right; long item names wrap instead of overflowing; every price stays readable.

- [ ] **Step 8: Final gates**
Run: `cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && npm run build`
Expected: exits 0. Route table contains `ƒ /invoice/[token]` and all pre-existing routes.
Run: `cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && npx eslint "src/app/invoice/[token]" "src/app/(admin)/pembayaran/payment-client.tsx"`
Expected: exits 0 with no output. (Do not run bare `npm run lint` as a gate — the repo-wide baseline is already 310 problems in files this feature does not touch.)

- [ ] **Step 9: Push the branch**
```bash
cd /Users/venturo/Documents/Websites/alqorni/shoesfast/shoesfast-app-fe && git push -u origin feat/invoice-share-link
```
