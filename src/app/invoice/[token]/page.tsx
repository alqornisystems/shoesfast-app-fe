import { cache } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { cn, formatCurrency, formatDate, waLink, titleCase } from "@/lib/utils"
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
  paid: { label: "LUNAS", color: "border-green-700 text-green-700" },
  partial: { label: "CICILAN", color: "border-blue-700 text-blue-700" },
  unpaid: { label: "BELUM BAYAR", color: "border-red-700 text-red-700" },
}

const LOGO_URL = "https://shoesfast.id/images/logo-shoesfast.png"

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
    description: `${titleCase(data.customer?.name) || "Pelanggan"} — Total ${formatCurrency(Number(data.total_price) || 0)}`,
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
        <p>Silakan hubungi Shoesfast untuk meminta link invoice yang baru.</p>
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

  // Dokumen, bukan halaman web: satu lembar kertas putih di atas latar abu, aturan garis tipis,
  // angka rata kanan dengan tabular-nums, dan tabel sungguhan untuk rincian item. Semua utility
  // `print:` menanggalkan latar dan bayangan supaya Ctrl+P menghasilkan lembar yang sama.
  return (
    <div className="min-h-screen bg-neutral-200/70 px-3 py-6 sm:px-6 sm:py-10 print:bg-white print:p-0">
      <article className="mx-auto w-full max-w-3xl bg-white p-6 text-neutral-900 shadow-lg ring-1 ring-black/5 sm:p-10 print:max-w-none print:p-0 print:shadow-none print:ring-0">
        {/* Kop */}
        <header className="flex flex-wrap items-start justify-between gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- host eksternal, tidak ada di
              remotePatterns next.config; <img> biasa menghindari perubahan konfigurasi. */}
          <img src={LOGO_URL} alt="Shoesfast" className="h-10 w-auto" width={176} height={40} />
          <div className="text-right">
            <p className="text-2xl font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Invoice
            </p>
            <p className="mt-1 font-mono text-sm font-medium">{data.code ?? "-"}</p>
          </div>
        </header>

        <div className="mt-5 border-t-2 border-neutral-900" />

        {/* Ditagihkan kepada + tanggal + stempel status */}
        <section className="mt-5 flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              Ditagihkan kepada
            </p>
            <p className="mt-1.5 font-semibold">{titleCase(data.customer?.name) || "-"}</p>
            <p className="text-sm text-neutral-600">{data.customer?.phone ?? "-"}</p>
            <p className="max-w-xs text-sm text-neutral-600">{data.customer?.address ?? "-"}</p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <dl className="text-sm">
              <div className="flex justify-end gap-3">
                <dt className="text-neutral-500">Tanggal</dt>
                <dd className="w-32 text-right tabular-nums">
                  {data.date ? formatDate(data.date, "dd MMMM yyyy") : "-"}
                </dd>
              </div>
              {data.due_date ? (
                <div className="mt-0.5 flex justify-end gap-3">
                  <dt className="text-neutral-500">Jatuh tempo</dt>
                  <dd className="w-32 text-right tabular-nums">
                    {formatDate(data.due_date, "dd MMMM yyyy")}
                  </dd>
                </div>
              ) : null}
            </dl>
            <span
              className={cn(
                "inline-flex -rotate-3 items-center border-2 px-3 py-1 text-sm font-bold uppercase tracking-widest",
                statusInfo?.color ?? "border-neutral-400 text-neutral-500",
              )}
            >
              {statusInfo?.label ?? "-"}
            </span>
          </div>
        </section>

        {/* Rincian */}
        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-neutral-900 text-[10px] uppercase tracking-widest text-neutral-500">
              <th className="w-8 py-2 text-left font-semibold">No</th>
              <th className="w-16 py-2 text-left font-semibold">Foto</th>
              <th className="py-2 text-left font-semibold">Deskripsi</th>
              <th className="py-2 text-right font-semibold">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr className="border-b border-neutral-200">
                <td colSpan={4} className="py-8 text-center text-neutral-500">
                  Tidak ada rincian item.
                </td>
              </tr>
            ) : (
              items.map((item, i) => {
                const treatments = item.treatments ?? []
                return (
                  <tr key={i} className="border-b border-neutral-200 align-top">
                    <td className="py-4 tabular-nums text-neutral-500">{i + 1}</td>
                    <td className="py-4">
                      <InvoicePhoto photo={item.photo ?? null} name={item.name ?? "Item"} />
                    </td>
                    <td className="py-4 pr-4">
                      <p className="break-words font-semibold">{titleCase(item.name) || "-"}</p>
                      <ul className="mt-1.5 space-y-0.5">
                        {treatments.map((t, j) => (
                          <li key={j} className="flex justify-between gap-4 text-neutral-600">
                            <span>{titleCase(t.name) || "-"}</span>
                            <span className="tabular-nums">
                              {formatCurrency(Number(t.price) || 0)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {Number(item.discount) > 0 ? (
                        <p className="mt-1 flex justify-between gap-4 text-red-700">
                          <span>Diskon</span>
                          <span className="tabular-nums">
                            -{formatCurrency(Number(item.discount))}
                          </span>
                        </p>
                      ) : null}
                    </td>
                    <td className="py-4 text-right font-semibold tabular-nums">
                      {formatCurrency(Number(item.price) || 0)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Total */}
        <section className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs text-sm">
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-neutral-600">Total</dt>
              <dd className="tabular-nums">{formatCurrency(Number(data.total_price) || 0)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-neutral-200 py-1">
              <dt className="text-neutral-600">Terbayar</dt>
              <dd className="tabular-nums">{formatCurrency(Number(data.total_paid) || 0)}</dd>
            </div>
            <div className="mt-2 flex justify-between gap-4 border-2 border-neutral-900 px-3 py-2 text-base font-bold">
              <dt>Sisa Tagihan</dt>
              <dd className="tabular-nums">{formatCurrency(Number(data.credit) || 0)}</dd>
            </div>
          </dl>
        </section>

        {/* Pembayaran diterima */}
        {payments.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              Pembayaran Diterima
            </h2>
            <table className="mt-2 w-full border-collapse text-sm">
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i} className="border-b border-neutral-200">
                    <td className="w-36 py-2 tabular-nums text-neutral-600">
                      {p.date ? formatDate(p.date) : "-"}
                    </td>
                    <td className="py-2 text-neutral-600">{p.note ?? "-"}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatCurrency(Number(p.nominal) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <footer className="mt-10 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-500">
          <p>Terima kasih atas kepercayaan Anda.</p>
          <p className="mt-0.5">Dokumen ini dibuat otomatis dan sah tanpa tanda tangan.</p>
        </footer>
      </article>
    </div>
  )
}
