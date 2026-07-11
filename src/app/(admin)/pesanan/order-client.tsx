"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Search, Loader2, ChevronLeft, ChevronRight, Calendar, Package, Truck } from "lucide-react"
import { api } from "@/lib/api"
import { waLink } from "@/lib/utils"
import { toast } from "sonner"

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

type Order = {
  id: number
  code: string
  date: number
  total_price: number
  total_discount: number
  status: number
  due_date: number
  has_pickup: boolean
  customer: {
    id: number
    name: string
    phone: string
    email: string | null
    address: string
  }
  project_name: string | null
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

const STATUS_LABELS: Record<number, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; color: string }> = {
  0: { label: "Pending", variant: "secondary", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  1: { label: "Proses", variant: "default", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  2: { label: "Selesai", variant: "outline", color: "bg-green-500/10 text-green-700 border-green-200" },
  3: { label: "Dibatalkan", variant: "destructive", color: "bg-red-500/10 text-red-700 border-red-200" },
}

const STORAGE_KEY_SEARCH = 'order_list_search'
const STORAGE_KEY_PAGE = 'order_list_page'

type Courier = {
  id: number
  name: string
  phone: string
}

export function OrderClient() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
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
  const [initialized, setInitialized] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Courier assignment
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [selectedCourierId, setSelectedCourierId] = useState<string>("")
  const [assigning, setAssigning] = useState(false)

  async function fetchOrders(page = 1) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(15),
      })

      if (search.trim()) {
        params.append('search', search.trim())
      }

      const res = await api.get<any>(`/api/orders?${params.toString()}`)
      setOrders(res.data ?? [])
      setPagination({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        per_page: res.per_page ?? 15,
        total: res.total ?? 0,
        from: res.from ?? 0,
        to: res.to ?? 0,
      })

      // Save current page to sessionStorage
      sessionStorage.setItem(STORAGE_KEY_PAGE, String(res.current_page ?? 1))
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedSearch = sessionStorage.getItem(STORAGE_KEY_SEARCH) || ''
    const savedPage = parseInt(sessionStorage.getItem(STORAGE_KEY_PAGE) || '1', 10)

    setSearch(savedSearch)
    setInitialized(true)
    fetchOrders(savedPage)
  }, [])

  // Save search to sessionStorage and reset to page 1
  useEffect(() => {
    if (!initialized) return

    sessionStorage.setItem(STORAGE_KEY_SEARCH, search)

    const timer = setTimeout(() => {
      fetchOrders(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/orders/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchOrders(pagination.current_page)
    } finally {
      setDeleting(false)
    }
  }

  async function loadCouriers() {
    try {
      const res = await api.get<Courier[]>("/api/sends/available-couriers")
      setCouriers(res)
    } catch {
      setCouriers([])
    }
  }

  function openPickupDialog(orderId: number) {
    setSelectedOrderId(orderId)
    loadCouriers()
    setPickupDialogOpen(true)
  }

  async function handleAssignPickup() {
    if (!selectedCourierId || !selectedOrderId) {
      toast.error("Pilih kurir terlebih dahulu")
      return
    }

    setAssigning(true)
    try {
      await api.post("/api/sends", {
        type: 0, // pickup
        users_id: Number(selectedCourierId),
        orders_id: selectedOrderId,
        date: new Date().toISOString().split('T')[0],
      })
      toast.success("Kurir pickup berhasil ditugaskan")
      setPickupDialogOpen(false)
      setSelectedCourierId("")
      setSelectedOrderId(null)
      fetchOrders(pagination.current_page)
    } catch (err: any) {
      toast.error(err?.message || "Gagal menugaskan kurir")
    } finally {
      setAssigning(false)
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pesanan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola pesanan layanan perawatan sepatu.
          </p>
        </div>
        <Button onClick={() => router.push('/pesanan/create')} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Buat Pesanan
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kode / customer..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="ml-auto">
            {pagination.total} pesanan
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 hidden md:table-cell">#</TableHead>
              <TableHead>Kode Order</TableHead>
              <TableHead className="hidden lg:table-cell">Customer</TableHead>
              <TableHead className="hidden md:table-cell">Tanggal</TableHead>
              <TableHead className="hidden xl:table-cell">Total</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-10 w-10 text-muted-foreground/50" />
                    <p>Belum ada data pesanan.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order, idx) => (
                <TableRow key={order.id}>
                  <TableCell className="text-center text-sm text-muted-foreground hidden md:table-cell">
                    {pagination.from + idx}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold">{order.code}</div>
                        <div className="text-xs text-muted-foreground lg:hidden truncate capitalize">
                          {order.customer?.phone ? (
                            <a
                              href={waLink(order.customer.phone)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                              title="Chat via WhatsApp"
                            >
                              {order.customer?.name ?? "-"}
                            </a>
                          ) : (
                            order.customer?.name ?? "-"
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground sm:hidden mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_LABELS[order.status]?.color || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                            {STATUS_LABELS[order.status]?.label || "Unknown"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="max-w-[200px]">
                      {order.customer?.phone ? (
                        <a
                          href={waLink(order.customer.phone)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block font-medium truncate capitalize text-primary hover:underline"
                          title="Chat via WhatsApp"
                        >
                          {order.customer?.name ?? "-"}
                        </a>
                      ) : (
                        <div className="font-medium truncate capitalize">{order.customer?.name ?? "-"}</div>
                      )}
                      <div className="text-xs text-muted-foreground truncate">{order.customer?.phone ?? "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(order.date)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="font-semibold text-sm">
                      {formatCurrency(order.total_price)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_LABELS[order.status]?.color || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                      {STATUS_LABELS[order.status]?.label || "Unknown"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {order.status === 0 && !order.has_pickup && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openPickupDialog(order.id)}
                          title="Assign Kurir Pickup"
                        >
                          <Truck className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => router.push(`/pesanan/${order.id}/edit`)}
                        title="Edit Pesanan"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(order)}
                        title="Hapus Pesanan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
              Menampilkan {pagination.from} - {pagination.to} dari {pagination.total} pesanan
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchOrders(pagination.current_page - 1)}
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
                onClick={() => fetchOrders(pagination.current_page + 1)}
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

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pesanan?</AlertDialogTitle>
            <AlertDialogDescription>
              Pesanan <span className="font-semibold text-foreground">"{deleteTarget?.code}"</span> akan dihapus.
              Data ini tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pickup Dialog */}
      <Dialog open={pickupDialogOpen} onOpenChange={setPickupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Kurir Pickup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="pickup-courier">Pilih Kurir</Label>
              <Select
                value={selectedCourierId}
                onValueChange={setSelectedCourierId}
              >
                <SelectTrigger id="pickup-courier">
                  <SelectValue placeholder="Pilih kurir untuk pickup" />
                </SelectTrigger>
                <SelectContent>
                  {couriers.map((courier) => (
                    <SelectItem key={courier.id} value={String(courier.id)}>
                      {courier.name} - {courier.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Kurir akan ditugaskan untuk mengambil pesanan dari customer.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPickupDialogOpen(false)}
              disabled={assigning}
            >
              Batal
            </Button>
            <Button
              onClick={handleAssignPickup}
              disabled={assigning}
              className="gap-1.5"
            >
              {assigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
