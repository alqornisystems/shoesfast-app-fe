"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Package, Truck, User, Search } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown } from "lucide-react"

type Courier = {
  id: number
  name: string
  phone: string | null
  email: string
}

type PickupOrder = {
  id: number
  code: string
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_maps: string | null
}

type DeliveryItem = {
  id: number
  orders_id: number
  name: string
  order_code: string
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_maps: string | null
  photo: string | null
}

export function SendFormClient() {
  const router = useRouter()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [courierId, setCourierId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const [couriers, setCouriers] = useState<Courier[]>([])
  const [pickupOrders, setPickupOrders] = useState<PickupOrder[]>([])
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([])
  const [loadingPickups, setLoadingPickups] = useState(false)
  const [loadingDeliveries, setLoadingDeliveries] = useState(false)

  // Selected items
  const [selectedPickupIds, setSelectedPickupIds] = useState<number[]>([])
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<number[]>([])

  // Search states
  const [pickupSearch, setPickupSearch] = useState("")
  const [deliverySearch, setDeliverySearch] = useState("")

  // Combobox states
  const [courierOpen, setCourierOpen] = useState(false)

  useEffect(() => {
    fetchCouriers()
    fetchPickupOrders()
    fetchDeliveryItems()
  }, [])

  async function fetchCouriers() {
    try {
      const res = await api.get<Courier[]>('/api/sends/available-couriers')
      setCouriers(res)
    } catch (error) {

      toast.error('Gagal memuat data kurir')
    }
  }

  async function fetchPickupOrders() {
    setLoadingPickups(true)
    try {
      const res = await api.get<PickupOrder[]>('/api/sends/available-pickup-orders')
      setPickupOrders(res)
    } catch (error) {

      toast.error('Gagal memuat data penjemputan')
    } finally {
      setLoadingPickups(false)
    }
  }

  async function fetchDeliveryItems() {
    setLoadingDeliveries(true)
    try {
      const res = await api.get<DeliveryItem[]>('/api/sends/available-delivery-items')
      setDeliveryItems(res)
    } catch (error) {

      toast.error('Gagal memuat data pengantaran')
    } finally {
      setLoadingDeliveries(false)
    }
  }

  function handlePickupToggle(id: number) {
    setSelectedPickupIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  function handleDeliveryToggle(id: number) {
    setSelectedDeliveryIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  async function handleSubmit() {
    if (!courierId) {
      toast.error('Kurir wajib dipilih')
      return
    }
    if (!date) {
      toast.error('Tanggal wajib diisi')
      return
    }
    if (selectedPickupIds.length === 0 && selectedDeliveryIds.length === 0) {
      toast.error('Pilih minimal 1 order/item untuk pengiriman')
      return
    }

    setSaving(true)

    try {
      // Create sends for pickups
      for (const orderId of selectedPickupIds) {
        await api.post("/api/sends", {
          users_id: courierId,
          date: date,
          type: 0, // pickup
          status: 0,
          orders_id: orderId,
        })
      }

      // Create sends for deliveries
      for (const itemId of selectedDeliveryIds) {
        const item = deliveryItems.find(i => i.id === itemId)
        if (item) {
          await api.post("/api/sends", {
            users_id: courierId,
            date: date,
            type: 1, // delivery
            status: 0,
            orders_id: item.orders_id,
            orders_items_id: itemId,
          })
        }
      }

      const totalCreated = selectedPickupIds.length + selectedDeliveryIds.length
      toast.success(`${totalCreated} pengiriman berhasil dibuat`)
      router.push("/pengiriman")
    } catch (err: any) {

      toast.error("Gagal membuat pengiriman. Silakan coba lagi.")
    } finally {
      setSaving(false)
    }
  }

  const selectedCourier = couriers.find(c => c.id === courierId)

  // Filter data based on search
  const filteredPickups = pickupOrders
    .filter(order =>
      order.code.toLowerCase().includes(pickupSearch.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(pickupSearch.toLowerCase()) ||
      order.customer_phone.includes(pickupSearch)
    )
    .slice(0, 10)

  const filteredDeliveries = deliveryItems
    .filter(item =>
      item.order_code.toLowerCase().includes(deliverySearch.toLowerCase()) ||
      item.name.toLowerCase().includes(deliverySearch.toLowerCase()) ||
      item.customer_name.toLowerCase().includes(deliverySearch.toLowerCase()) ||
      item.customer_phone.includes(deliverySearch)
    )
    .slice(0, 10)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/pengiriman')}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buat Pengiriman Baru</h1>
          <p className="text-sm text-muted-foreground">Pilih order untuk dijemput atau item untuk diantar</p>
        </div>
      </div>

      {/* Send Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Pengiriman</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Courier Combobox */}
          <div className="space-y-1.5">
            <Label>Kurir <span className="text-destructive">*</span></Label>
            <Popover open={courierOpen} onOpenChange={setCourierOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={courierOpen}
                  className="w-full justify-between"
                >
                  {selectedCourier ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCourier.name}</span>
                      {selectedCourier.phone && (
                        <span className="text-xs text-muted-foreground">({selectedCourier.phone})</span>
                      )}
                    </div>
                  ) : (
                    "Pilih kurir..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cari kurir..." />
                  <CommandList>
                    <CommandEmpty>Kurir tidak ditemukan.</CommandEmpty>
                    <CommandGroup>
                      {couriers.map((courier) => (
                        <CommandItem
                          key={courier.id}
                          value={`${courier.name} ${courier.phone || ''}`}
                          onSelect={() => {
                            setCourierId(courier.id)
                            setCourierOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              courierId === courier.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{courier.name}</span>
                            {courier.phone && (
                              <span className="text-xs text-muted-foreground">({courier.phone})</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date">Tanggal <span className="text-destructive">*</span></Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pickup Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Penjemputan</CardTitle>
                <CardDescription className="text-xs">Order yang belum dijemput</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari order..."
                value={pickupSearch}
                onChange={(e) => setPickupSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loadingPickups ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Memuat data...</p>
                </div>
              ) : filteredPickups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Tidak ada order</p>
                </div>
              ) : (
                filteredPickups.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handlePickupToggle(order.id)}
                  >
                    <Checkbox
                      checked={selectedPickupIds.includes(order.id)}
                      onCheckedChange={() => handlePickupToggle(order.id)}
                      className="mt-1"
                    />
                    <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border shrink-0">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {order.code}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {order.customer_phone}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        📍 {order.customer_address}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Counter */}
            {selectedPickupIds.length > 0 && (
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                {selectedPickupIds.length} order dipilih
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Pengantaran</CardTitle>
                <CardDescription className="text-xs">Item yang sudah selesai</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari item..."
                value={deliverySearch}
                onChange={(e) => setDeliverySearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loadingDeliveries ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Memuat data...</p>
                </div>
              ) : filteredDeliveries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Tidak ada item</p>
                </div>
              ) : (
                filteredDeliveries.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleDeliveryToggle(item.id)}
                  >
                    <Checkbox
                      checked={selectedDeliveryIds.includes(item.id)}
                      onCheckedChange={() => handleDeliveryToggle(item.id)}
                      className="mt-1"
                    />
                    {item.photo ? (
                      <img
                        src={item.photo}
                        alt={item.name}
                        className="h-14 w-14 rounded-lg object-cover border shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center border shrink-0">
                        <Package className="h-6 w-6 text-orange-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base">{item.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {item.order_code}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        👤 {item.customer_name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        📍 {item.customer_address}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Counter */}
            {selectedDeliveryIds.length > 0 && (
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                {selectedDeliveryIds.length} item dipilih
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      {(selectedPickupIds.length > 0 || selectedDeliveryIds.length > 0) && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Total Pengiriman</div>
                <div className="text-2xl font-bold">
                  {selectedPickupIds.length + selectedDeliveryIds.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedPickupIds.length} pickup • {selectedDeliveryIds.length} delivery
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Kurir</div>
                <div className="font-medium">{selectedCourier?.name || "-"}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Tanggal</div>
                <div className="font-medium">
                  {new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/pengiriman')}
          disabled={saving}
        >
          Batal
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="gap-1.5"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Buat {selectedPickupIds.length + selectedDeliveryIds.length} Pengiriman
        </Button>
      </div>
    </div>
  )
}
