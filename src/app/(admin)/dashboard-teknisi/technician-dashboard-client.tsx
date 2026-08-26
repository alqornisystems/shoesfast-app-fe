"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, ChevronRight, Clock, Loader2, Package, Sparkles, User, Wrench } from "lucide-react"

import { api } from "@/lib/api"
import { cn, titleCase } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

type QueueItem = {
  id: number
  orders_code: string | null
  orders_items_name: string | null
  orders_items_photo: string | null
  customers_name: string | null
  users_name: string | null
  services_name: string | null
  created_at: number
}

function getImageUrl(photo: string | null): string | null {
  if (!photo) return null
  if (photo.startsWith("http")) return photo
  return `/${photo}`
}

function umurHari(timestamp: number): number {
  return Math.max(0, Math.floor((Date.now() / 1000 - timestamp) / 86400))
}

export function TechnicianDashboardClient() {
  const [summary, setSummary] = useState<ServiceSummary[]>([])
  const [loadingSummary, setLoadingSummary] = useState(true)

  const [selected, setSelected] = useState<ServiceSummary | null>(null)
  const [items, setItems] = useState<QueueItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

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

  async function bukaTreatment(service: ServiceSummary) {
    // Klik kartu yang sama menutupnya kembali.
    if (selected?.services_id === service.services_id) {
      setSelected(null)
      setItems([])
      return
    }

    setSelected(service)
    setLoadingItems(true)
    try {
      const params = new URLSearchParams({
        page_type: "waiting_list",
        per_page: "100",
        services_id: String(service.services_id),
        sort: "created_at",
        order: "asc",
      })
      const res = await api.get<{ data?: QueueItem[] }>(`/api/treatments?${params.toString()}`)
      setItems(res.data ?? [])
    } catch {
      setItems([])
    } finally {
      setLoadingItems(false)
    }
  }

  const totalMenunggu = summary.reduce((sum, row) => sum + row.menunggu, 0)
  const totalTerlambat = summary.reduce((sum, row) => sum + row.terlambat, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Teknisi</h1>
        <p className="text-sm text-muted-foreground">
          Semua jenis treatment yang sedang berjalan beserta jumlahnya. Kartu paling atas yang
          paling mendesak — buka satu kartu untuk melihat barangnya.
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

      {loadingSummary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : summary.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
          <Package className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50" />
          <p>Tidak ada pekerjaan yang sedang berjalan.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summary.map((service, idx) => {
            const terbuka = selected?.services_id === service.services_id
            const mendesak = service.terlambat > 0

            return (
              <button
                key={service.services_id}
                type="button"
                onClick={() => bukaTreatment(service)}
                aria-expanded={terbuka}
                className={cn(
                  "rounded-xl border bg-card p-4 text-left shadow-sm transition-colors",
                  "hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  terbuka && "border-primary bg-primary/[0.04]",
                  mendesak && !terbuka && "border-red-300",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 font-semibold capitalize text-primary">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span className="truncate">{service.services_name ?? "Tanpa nama"}</span>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      terbuka && "rotate-90",
                    )}
                  />
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
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-1.5 font-semibold capitalize text-primary">
              <Sparkles className="h-4 w-4 shrink-0" />
              {selected.services_name ?? "Tanpa nama"}
            </div>
            <Badge variant="secondary">{selected.menunggu} menunggu</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-8"
              onClick={() => {
                setSelected(null)
                setItems([])
              }}
            >
              Tutup
            </Button>
          </div>

          {loadingItems ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat barang…
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Tidak ada barang yang menunggu untuk treatment ini.
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item, idx) => {
                const umur = umurHari(item.created_at)

                return (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-6 shrink-0 pt-1 text-sm text-muted-foreground">{idx + 1}</div>
                    {getImageUrl(item.orders_items_photo) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getImageUrl(item.orders_items_photo)!}
                        alt={item.orders_items_name ?? "Barang"}
                        className="h-14 w-14 shrink-0 rounded-lg border object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-muted">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-sm font-bold">
                        {titleCase(item.orders_items_name ?? "-")}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.orders_code ?? "-"}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {titleCase(item.customers_name ?? "-")}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "shrink-0 text-right text-xs",
                        umur > 21 ? "font-semibold text-red-600" : umur > 14 ? "font-semibold text-yellow-600" : "text-muted-foreground",
                      )}
                    >
                      {umur} hari
                      <div className="text-muted-foreground">menunggu</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
