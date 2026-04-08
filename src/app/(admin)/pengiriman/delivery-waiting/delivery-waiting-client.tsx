"use client"

import { useEffect, useState } from "react"
import { Search, Loader2, ChevronLeft, ChevronRight, Package, MapPin, Phone, Truck, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"

type OrderItem = {
  id: number
  orders_id: number
  order_code: string | null
  name: string
  price: number
  discount: number
  photo: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  customer_maps: string | null
  project_name: string | null
  created_at: number
}

type Courier = {
  id: number
  name: string
  phone: string | null
  email: string
}

export function DeliveryWaitingClient() {
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedCourierId, setSelectedCourierId] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [creating, setCreating] = useState(false)

  async function fetchItems() {
    setLoading(true)
    try {
      const res = await api.get<{ data: OrderItem[] }>('/api/sends/delivery-waiting-list')
      setItems(res.data ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchCouriers() {
    try {
      const res = await api.get<Courier[]>('/api/sends/available-couriers')
      setCouriers(res)
    } catch (error) {
      toast.error("Gagal memuat data kurir")
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  function toggleSelection(id: number) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredItems.map(i => i.id))
    }
  }

  function openCreateDialog() {
    if (selectedIds.length === 0) {
      toast.warning("Pilih minimal 1 item", {
        description: "Centang item yang ingin dijadwalkan untuk delivery",
        duration: 3000,
      })
      return
    }

    // Set default date to today
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    setSelectedDate(`${yyyy}-${mm}-${dd}`)
    setSelectedCourierId("")
    fetchCouriers()
    setCreateDialogOpen(true)
  }

  async function handleCreateDelivery() {
    if (!selectedCourierId) {
      toast.error("Pilih kurir terlebih dahulu")
      return
    }
    if (!selectedDate) {
      toast.error("Tanggal delivery wajib diisi")
      return
    }

    setCreating(true)
    try {
      // Create delivery for each selected item
      const promises = selectedIds.map(itemId =>
        api.post('/api/sends', {
          users_id: Number(selectedCourierId),
          orders_items_id: itemId,
          date: new Date(selectedDate).toISOString().split('T')[0],
          type: 1, // delivery
          status: 0, // pending
        })
      )

      await Promise.all(promises)

      const courier = couriers.find(c => c.id === Number(selectedCourierId))
      toast.success(
        `${selectedIds.length} delivery berhasil dijadwalkan`,
        {
          description: `Kurir: ${courier?.name || 'Unknown'} • ${new Date(selectedDate).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}`,
          duration: 4000,
        }
      )

      setCreateDialogOpen(false)
      setSelectedIds([])
      setSelectedCourierId("")
      setSelectedDate("")
      fetchItems()
    } catch (error: any) {
      toast.error(
        "Gagal membuat delivery",
        {
          description: error?.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.",
          duration: 4000,
        }
      )
    } finally {
      setCreating(false)
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  function getTodayDate(): string {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  function getImageUrl(photo: string | null): string | null {
    if (!photo) return null
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo
    }
    return `${process.env.NEXT_PUBLIC_API_URL}/${photo.startsWith('storage/') ? photo : `storage/${photo}`}`
  }

  // Filter items by search
  const filteredItems = items.filter(item => {
    const searchLower = search.toLowerCase()
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.order_code?.toLowerCase().includes(searchLower) ||
      item.customer_name?.toLowerCase().includes(searchLower) ||
      item.customer_phone?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delivery Waiting List</h1>
          <p className="text-sm text-muted-foreground">
            Daftar item yang sudah selesai dan siap diantar ke customer
          </p>
        </div>
        {selectedIds.length > 0 && (
          <Button onClick={openCreateDialog} size="sm" className="gap-1.5">
            <Truck className="h-4 w-4" />
            Buat Delivery ({selectedIds.length})
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari item / customer..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="ml-auto">
            {filteredItems.length} item
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden lg:table-cell">Alamat</TableHead>
              <TableHead className="text-right">Harga</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-12 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-10 w-10 text-muted-foreground/50" />
                    <p>Tidak ada item yang siap untuk delivery.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedIds.includes(item.id)
                return (
                  <TableRow
                    key={item.id}
                    className={isSelected ? "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500" : "cursor-pointer"}
                    onClick={() => toggleSelection(item.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(item.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getImageUrl(item.photo) ? (
                          <img
                            src={getImageUrl(item.photo)!}
                            alt={item.name}
                            className="h-12 w-12 rounded-lg object-cover border"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted border">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.order_code}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{item.customer_name || "-"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {item.customer_phone || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-start gap-1.5 max-w-[300px]">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {item.customer_address || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-semibold text-sm">
                        {formatCurrency(item.price - item.discount)}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Delivery Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Buat Jadwal Delivery</DialogTitle>
            <DialogDescription>
              Jadwalkan delivery untuk {selectedIds.length} item yang dipilih
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Info Badge */}
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-blue-900">
                  {selectedIds.length} Item Dipilih
                </div>
                <div className="text-xs text-blue-700">
                  Delivery akan dijadwalkan untuk tanggal yang dipilih
                </div>
              </div>
            </div>

            {/* Courier Selection */}
            <div className="space-y-2">
              <Label htmlFor="courier" className="text-sm font-semibold">
                Pilih Kurir <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedCourierId}
                onValueChange={setSelectedCourierId}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="-- Pilih Kurir --" />
                </SelectTrigger>
                <SelectContent>
                  {couriers.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Tidak ada kurir tersedia
                    </div>
                  ) : (
                    couriers.map((courier) => (
                      <SelectItem key={courier.id} value={String(courier.id)}>
                        <div className="flex items-start gap-2 py-1">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold text-xs">
                            {courier.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{courier.name}</div>
                            {courier.phone && (
                              <div className="text-xs text-muted-foreground">{courier.phone}</div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-semibold">
                Tanggal Delivery <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                min={getTodayDate()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Delivery akan dilakukan pada tanggal yang dipilih
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
              className="flex-1 sm:flex-none"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleCreateDelivery}
              disabled={creating || !selectedCourierId || !selectedDate}
              className="gap-2 flex-1 sm:flex-none"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              <Truck className="h-4 w-4" />
              Buat Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
