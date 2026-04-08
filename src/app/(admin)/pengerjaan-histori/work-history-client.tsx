"use client"

import { useEffect, useState } from "react"
import { Search, Loader2, ChevronLeft, ChevronRight, Package, User, Calendar, CheckCircle2 } from "lucide-react"
import { api } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

type Treatment = {
  id: number
  orders_id: number
  orders_code: string
  orders_items_id: number
  orders_items_name: string
  orders_items_photo: string | null
  services_id: number
  services_name: string
  services_estimation: number
  customers_name: string
  customers_phone: string
  users_id: number | null
  users_name: string | null
  partnerships_id: number | null
  status: number
  date_start: number
  date_end: number
  progress: number
  price: number
  note: string | null
  is_partnerships: number
  done_at: number | null
  created_at: number
}

type PaginationData = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

const STATUS_LABELS: Record<number, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  2: { label: "Selesai", variant: "outline" },
  3: { label: "Dibatalkan", variant: "destructive" },
}

export function WorkHistoryClient() {
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
    from: 0,
    to: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  function getImageUrl(photo: string | null): string | null {
    if (!photo) return null
    // If it starts with http:// or https://, it's already a full URL
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo
    }
    // Otherwise, it's a storage path
    return `/${photo.startsWith('storage/') ? photo : `storage/${photo}`}`
  }

  async function fetchTreatments(page = 1) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(15),
        page_type: "history",
      })

      if (search.trim()) {
        params.append('search', search.trim())
      }

      const res = await api.get<any>(`/api/treatments?${params.toString()}`)
      setTreatments(res.data ?? [])
      setPagination({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        per_page: res.per_page ?? 15,
        total: res.total ?? 0,
        from: res.from ?? 0,
        to: res.to ?? 0,
      })
    } catch {
      setTreatments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTreatments()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTreatments(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  function formatDateTime(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  function calculateDuration(dateStart: number, doneAt: number | null): string {
    if (!doneAt) return "-"

    const durationSeconds = doneAt - dateStart
    const days = Math.floor(durationSeconds / 86400)
    const hours = Math.floor((durationSeconds % 86400) / 3600)

    if (days > 0) {
      return `${days} hari ${hours} jam`
    }
    return `${hours} jam`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histori Pengerjaan</h1>
          <p className="text-sm text-muted-foreground">
            Riwayat item yang sudah selesai dikerjakan.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari customer / item..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="ml-auto">
            {pagination.total} item
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 hidden md:table-cell">#</TableHead>
              <TableHead>Order / Item</TableHead>
              <TableHead className="hidden lg:table-cell">Customer</TableHead>
              <TableHead className="hidden xl:table-cell">Teknisi</TableHead>
              <TableHead className="hidden md:table-cell">Selesai</TableHead>
              <TableHead className="hidden lg:table-cell">Durasi</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-right">Harga</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : treatments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-10 w-10 text-muted-foreground/50" />
                    <p>Belum ada histori pengerjaan.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              treatments.map((treatment, idx) => (
                <TableRow key={treatment.id}>
                  <TableCell className="text-center text-sm text-muted-foreground hidden md:table-cell">
                    {pagination.from + idx}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {getImageUrl(treatment.orders_items_photo) ? (
                        <img
                          src={getImageUrl(treatment.orders_items_photo)!}
                          alt={treatment.orders_items_name}
                          className="h-12 w-12 rounded-lg object-cover border"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted border">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{treatment.orders_code}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {treatment.orders_items_name}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {treatment.services_name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="max-w-[200px]">
                      <div className="font-medium text-sm truncate">{treatment.customers_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{treatment.customers_phone}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{treatment.users_name || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {treatment.done_at ? formatDate(treatment.done_at) : formatDate(treatment.date_end)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="text-sm text-muted-foreground">
                      {calculateDuration(treatment.date_start, treatment.done_at)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={STATUS_LABELS[treatment.status]?.variant || "outline"}>
                      {STATUS_LABELS[treatment.status]?.label || "Selesai"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-semibold text-sm">
                      {formatCurrency(treatment.price)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Menampilkan {pagination.from} - {pagination.to} dari {pagination.total} item
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTreatments(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
                className="h-8 gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </Button>
              <div className="text-sm font-medium px-2">
                {pagination.current_page} / {pagination.last_page}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTreatments(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.last_page}
                className="h-8 gap-1"
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
