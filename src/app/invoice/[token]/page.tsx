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
  total_price: number | string
  total_paid: number | string
  credit: number | string
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
 * di server. Ini SATU-SATUNYA pengecualian yang SENGAJA disahkan dari aturan "semua panggilan
 * lewat `api`" di CLAUDE.md / docs/patterns/data-layer.md — bukan berarti satu-satunya raw
 * `fetch` di repo ini: ~24 halaman laporan lama masih melakukannya sebagai utang migrasi, bukan
 * preseden. Alasan pengecualian ini ditulis di sini supaya tidak dikira kelalaian. Tombol "Salin
 * Link" di halaman admin tetap lewat klien `api` biasa.
 *
 * `cache: "no-store"` supaya status pembayaran selalu mutakhir; `cache()` dari React membuat
 * generateMetadata dan komponen halaman berbagi satu panggilan, bukan dua.
 */
const getInvoice = cache(async (token: string): Promise<FetchResult> => {
  try {
    const res = await fetch(`${BASE_URL}/api/public/invoice/${encodeURIComponent(token)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      // Backend yang hang (DB lock, PHP-FPM jenuh) tanpa ini akan menggantung sampai timeout
      // fungsi Vercel dan menampilkan galat bahasa Inggris. `catch` di bawah sudah mengubah
      // AbortError jadi status 0, yang merender notice bahasa Indonesia yang sama seperti backend
      // yang down.
      signal: AbortSignal.timeout(8000),
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
  // Halaman ini merender PII customer (nama, telepon, alamat) langsung ke HTML. Token memang
  // sulit ditebak, tapi customer bisa saja menempel link ini di forum publik saat minta bantuan —
  // begitu terindeks, invoice tetap bisa dicari selama token itu berlaku.
  if (!data) return { title: "Invoice · Shoesfast", robots: { index: false, follow: false } }
  return {
    title: `Invoice ${data.code ?? "-"} · Shoesfast`,
    description: `${data.customer?.name ?? "Pelanggan"} — Total ${formatCurrency(Number(data.total_price) || 0)}`,
    robots: { index: false, follow: false },
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

  // Nama diubah dari `status` (dipakai brief) jadi `statusInfo`: `status` di atas sudah dipakai
  // untuk kode HTTP (200/404/410/dst) dari hasil fetch, jadi deklarasi ulang dengan nama sama
  // di scope yang sama adalah error TypeScript ("Cannot redeclare block-scoped variable").
  const statusInfo = STATUS_LABELS[data.payment_status]
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
                  statusInfo?.color ?? "bg-gray-100 text-gray-700 border-gray-200",
                )}
              >
                {statusInfo?.label ?? "-"}
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
                {formatCurrency(Number(data.total_price) || 0)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Terbayar</span>
              <span className="font-medium tabular-nums text-green-600">
                {formatCurrency(Number(data.total_paid) || 0)}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-t pt-1.5 text-base font-semibold">
              <span>Sisa</span>
              <span
                className={cn(
                  "tabular-nums",
                  (Number(data.credit) || 0) > 0 ? "text-red-600" : "text-green-600",
                )}
              >
                {formatCurrency(Number(data.credit) || 0)}
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
