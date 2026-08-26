"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, Clock, Package, Search, Sparkles, Wrench } from "lucide-react"

import { api } from "@/lib/api"
import { cn, titleCase } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

type ServiceSummary = {
  services_id: number
  services_name: string | null
  services_estimation: number
  total: number
  menunggu: number
  dikerjakan: number
  terlambat: number
  antrean_terlama: number | null
}

function umurHari(timestamp: number): number {
  return Math.max(0, Math.floor((Date.now() / 1000 - timestamp) / 86400))
}

export function TechnicianDashboardClient() {
  const [summary, setSummary] = useState<ServiceSummary[]>([])
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [cari, setCari] = useState("")

  useEffect(() => {
    async function ambil() {
      try {
        const res = await api.get<{ data: ServiceSummary[] }>("/api/treatments/summary-by-service")
        setSummary(res.data ?? [])
      } catch {
        setSummary([])
      } finally {
        setLoadingSummary(false)
      }
    }

    ambil()
  }, [])

  // Seluruh ringkasan sudah ada di sini — satu baris per jenis layanan, bukan ribuan —
  // jadi pencariannya disaring di tempat, tanpa bolak-balik ke server.
  const kunci = cari.trim().toLowerCase()
  const tersaring = kunci
    ? summary.filter((row) => (row.services_name ?? "").toLowerCase().includes(kunci))
    : summary

  // Angka ringkas di atas tetap menghitung SELURUH antrean, bukan hasil pencarian:
  // "Terlambat 7" yang menyusut jadi 2 karena sedang mengetik itu menyesatkan.
  const totalMenunggu = summary.reduce((sum, row) => sum + row.menunggu, 0)
  const totalTerlambat = summary.reduce((sum, row) => sum + row.terlambat, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Teknisi</h1>
        <p className="text-sm text-muted-foreground">
          Semua jenis treatment yang sedang berjalan beserta jumlahnya. Kartu paling atas yang
          paling mendesak — tekan satu kartu untuk membuka daftar barangnya.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jenis Treatment</p>
              <p className="text-2xl font-bold">{summary.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Menunggu Dikerjakan</p>
              <p className="text-2xl font-bold">{totalMenunggu}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Terlambat</p>
              <p className="text-2xl font-bold">{totalTerlambat}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative sm:max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari treatment..."
          className="h-9 pl-8"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
      </div>

      {loadingSummary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : tersaring.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
          <Package className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50" />
          <p>
            {kunci
              ? `Tidak ada treatment bernama "${cari.trim()}".`
              : "Tidak ada pekerjaan yang sedang berjalan."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tersaring.map((service, idx) => {
            const mendesak = service.terlambat > 0

            return (
              // Menuju daftar barangnya yang sudah tersaring ke jenis ini. Daftar itu
              // tidak digandakan di sini: di halaman antrean barangnya bisa langsung
              // dicentang dan diambil, dan itu yang mau dilakukan setelah melihatnya.
              <Link
                key={service.services_id}
                href={`/pengerjaan-waiting?services_id=${service.services_id}`}
                className={cn(
                  "block rounded-xl border bg-card p-4 text-left shadow-sm transition-colors",
                  "hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  mendesak && "border-red-300",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 font-semibold capitalize text-primary">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span className="truncate">{titleCase(service.services_name) || "Tanpa nama"}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>

                {/* Yang paling mendesak diberi label, bukan cuma diletakkan di atas —
                    urutan saja tidak terbaca sebagai prioritas. */}
                {idx === 0 && mendesak && (
                  <Badge variant="destructive" className="mt-2 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Kerjakan duluan
                  </Badge>
                )}

                <div className="mt-3 flex items-end gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Menunggu</div>
                    <div className="text-2xl font-bold leading-none">{service.menunggu}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Dikerjakan</div>
                    <div className="text-2xl font-bold leading-none text-muted-foreground">
                      {service.dikerjakan}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Estimasi {service.services_estimation} hari</span>
                  {service.antrean_terlama !== null && (
                    <span>· antre {umurHari(service.antrean_terlama)} hari</span>
                  )}
                  {service.terlambat > 0 && (
                    <span className="font-semibold text-red-600">· {service.terlambat} terlambat</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
