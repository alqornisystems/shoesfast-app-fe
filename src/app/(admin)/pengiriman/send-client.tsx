"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Search, Loader2, CheckCircle, Calendar, Truck, Package, ChevronLeft, ChevronRight, MapPin } from "lucide-react"
import { api } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

type Send = {
  id: number
  date: number
  status: number
  type: number
  user: {
    id: number
    name: string
    phone: string | null
  }
  order: {
    id: number
    code: string
    customer_name: string
    customer_phone: string
    customer_address: string
  }
  order_item: {
    id: number
    name: string
  } | null
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

const STATUS_LABELS: Record<number, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  0: { label: "Pending", variant: "secondary" },
  1: { label: "Selesai", variant: "outline" },
}

const STORAGE_KEY_SEARCH = 'send_list_search'
const STORAGE_KEY_PAGE = 'send_list_page'
const STORAGE_KEY_TAB = 'send_list_tab'

export function SendClient() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"pickup" | "delivery">("pickup")
  const [sends, setSends] = useState<Send[]>([])
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
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [deleteTarget, setDeleteTarget] = useState<Send | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Edit modal state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingSend, setEditingSend] = useState<Send | null>(null)
  const [editCourierId, setEditCourierId] = useState("")
  const [editStatus, setEditStatus] = useState("")
  const [couriers, setCouriers] = useState<any[]>([])
  const [updating, setUpdating] = useState(false)

  async function fetchSends(page = 1) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(15),
        type: activeTab === "pickup" ? "0" : "1",
      })

      if (search.trim()) {
        params.append('search', search.trim())
      }

      const res = await api.get<any>(`/api/sends?${params.toString()}`)
      setSends(res.data ?? [])
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
      setSends([])
    } finally {
      setLoading(false)
    }
  }

  // Restore state from sessionStorage on mount (single initial fetch)
  useEffect(() => {
    const savedSearch = sessionStorage.getItem(STORAGE_KEY_SEARCH) || ''
    const savedTab = (sessionStorage.getItem(STORAGE_KEY_TAB) as "pickup" | "delivery") || "pickup"
    const savedPage = parseInt(sessionStorage.getItem(STORAGE_KEY_PAGE) || '1', 10)

    setSearch(savedSearch)
    setActiveTab(savedTab)
    setInitialized(true)
    fetchSends(savedPage)
  }, [])

  // Refetch on tab change and persist active tab (skips the mount run)
  useEffect(() => {
    if (!initialized) return

    sessionStorage.setItem(STORAGE_KEY_TAB, activeTab)
    fetchSends(1)
  }, [activeTab])

  // Save search to sessionStorage and reset to page 1 (debounced)
  useEffect(() => {
    if (!initialized) return

    sessionStorage.setItem(STORAGE_KEY_SEARCH, search)

    const timer = setTimeout(() => {
      fetchSends(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/sends/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchSends(pagination.current_page)
    } finally {
      setDeleting(false)
    }
  }

  async function handleMarkCompleted(id: number) {
    try {
      await api.post('/api/sends/mark-completed', { ids: [id] })
      fetchSends(pagination.current_page)
    } catch (error) {
      console.error('Failed to mark as completed:', error)
    }
  }

  function toggleSelection(id: number) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    // Only select pending sends (status 0)
    const pendingSends = sends.filter(s => s.status === 0)
    if (selectedIds.length === pendingSends.length && pendingSends.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(pendingSends.map(s => s.id))
    }
  }

  async function handleBulkMarkCompleted() {
    if (selectedIds.length === 0) return

    try {
      await api.post('/api/sends/mark-completed', { ids: selectedIds })
      setSelectedIds([])
      fetchSends(pagination.current_page)
    } catch (error) {
      console.error('Failed to bulk mark as completed:', error)
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  async function fetchCouriers() {
    try {
      const res = await api.get<any[]>('/api/sends/available-couriers')
      setCouriers(res)
    } catch (error) {
      console.error('Failed to fetch couriers:', error)
    }
  }

  function openEditDialog(send: Send) {
    setEditingSend(send)
    setEditCourierId(String(send.user.id))
    setEditStatus(String(send.status))
    fetchCouriers()
    setEditDialogOpen(true)
  }

  async function handleUpdate() {
    if (!editingSend) return

    setUpdating(true)
    try {
      await api.put(`/api/sends/${editingSend.id}`, {
        users_id: Number(editCourierId),
        status: Number(editStatus),
      })

      setEditDialogOpen(false)
      setEditingSend(null)
      fetchSends(pagination.current_page)
    } catch (error: any) {
      console.error('Failed to update send:', error)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengiriman</h1>
          <p className="text-sm text-muted-foreground">
            Kelola penjemputan dan pengantaran pesanan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button onClick={handleBulkMarkCompleted} variant="default" size="sm" className="gap-1.5">
              <CheckCircle className="h-4 w-4" />
              Selesaikan ({selectedIds.length})
            </Button>
          )}
          <Button onClick={() => router.push('/pengiriman/create')} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Tambah Pengiriman
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pickup" | "delivery")} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pickup" className="gap-2">
            <Package className="h-4 w-4" />
            Penjemputan
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-2">
            <Truck className="h-4 w-4" />
            Pengantaran
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
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
                {pagination.total} {activeTab === "pickup" ? "penjemputan" : "pengantaran"}
              </Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length > 0 && selectedIds.length === sends.filter(s => s.status === 0).length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-12 hidden md:table-cell">#</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="hidden lg:table-cell">Customer</TableHead>
                  <TableHead className="hidden xl:table-cell">Kurir</TableHead>
                  <TableHead className="hidden md:table-cell">Tanggal</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-6" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : sends.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        {activeTab === "pickup" ? (
                          <Package className="h-10 w-10 text-muted-foreground/50" />
                        ) : (
                          <Truck className="h-10 w-10 text-muted-foreground/50" />
                        )}
                        <p>Belum ada data {activeTab === "pickup" ? "penjemputan" : "pengantaran"}.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sends.map((send, idx) => (
                    <TableRow key={send.id}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(send.id)}
                          onCheckedChange={() => toggleSelection(send.id)}
                          disabled={send.status !== 0}
                        />
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground hidden md:table-cell">
                        {pagination.from + idx}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${activeTab === "pickup" ? "bg-blue-500/10" : "bg-green-500/10"}`}>
                            {activeTab === "pickup" ? (
                              <Package className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Truck className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold">{send.order.code}</div>
                            {send.order_item && (
                              <div className="text-xs text-muted-foreground truncate">
                                {send.order_item.name}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground lg:hidden truncate">
                              {send.order.customer_name}
                            </div>
                            <div className="text-xs text-muted-foreground sm:hidden">
                              <Badge variant={STATUS_LABELS[send.status]?.variant || "secondary"} className="text-[10px] h-5">
                                {STATUS_LABELS[send.status]?.label || "Unknown"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="max-w-[200px]">
                          <div className="font-medium truncate">{send.order.customer_name}</div>
                          <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {send.order.customer_address}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="text-sm font-medium">{send.user?.name || "-"}</div>
                        <div className="text-xs text-muted-foreground">{send.user?.phone || "-"}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(send.date)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={STATUS_LABELS[send.status]?.variant || "secondary"}>
                          {STATUS_LABELS[send.status]?.label || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {send.user && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditDialog(send)}
                              title="Edit Pengiriman"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(send)}
                            title="Hapus Pengiriman"
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
                  Menampilkan {pagination.from} - {pagination.to} dari {pagination.total} {activeTab === "pickup" ? "penjemputan" : "pengantaran"}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchSends(pagination.current_page - 1)}
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
                    onClick={() => fetchSends(pagination.current_page + 1)}
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
        </TabsContent>
      </Tabs>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengiriman?</AlertDialogTitle>
            <AlertDialogDescription>
              Pengiriman untuk order <span className="font-semibold text-foreground">"{deleteTarget?.order.code}"</span> akan dihapus.
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Pengiriman
            </DialogTitle>
            <DialogDescription>
              Ubah kurir atau status pengiriman
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Send Info */}
            {editingSend && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${editingSend.type === 0 ? "bg-blue-500/10" : "bg-green-500/10"}`}>
                    {editingSend.type === 0 ? (
                      <Package className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Truck className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{editingSend.order.code}</div>
                    <div className="text-xs text-muted-foreground">{editingSend.order.customer_name}</div>
                    {editingSend.order_item && (
                      <div className="text-xs text-muted-foreground mt-1">{editingSend.order_item.name}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Courier Select */}
            <div className="space-y-2">
              <Label htmlFor="courier" className="text-sm font-semibold">
                Kurir
              </Label>
              <Select value={editCourierId} onValueChange={setEditCourierId}>
                <SelectTrigger id="courier">
                  <SelectValue placeholder="Pilih kurir..." />
                </SelectTrigger>
                <SelectContent>
                  {couriers.map((courier) => (
                    <SelectItem key={courier.id} value={String(courier.id)}>
                      {courier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Select */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-semibold">
                Status
              </Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Pilih status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Pending</SelectItem>
                  <SelectItem value="1">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updating}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleUpdate}
              disabled={updating || !editCourierId || !editStatus}
              className="gap-2"
            >
              {updating && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle className="h-4 w-4" />
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
