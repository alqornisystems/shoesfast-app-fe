"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { ArrowLeft, Loader2, Plus, Trash2, X, Upload, UserCog, Check, ChevronsUpDown } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import Swal from "sweetalert2"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

type Order = {
  id: number
  code: string
  date: number
  note: string
  customer: {
    id: number
    name: string
    phone: string
    address: string
  }
  items: OrderItem[]
}

type OrderItem = {
  id: number
  name: string
  price: number
  discount: number
  type: number
  photo: string | null
  note: string
  checkbox: string
  treatments: Treatment[]
  delivery_courier_name?: string | null
}

type Treatment = {
  id: number
  services_id: number
  name: string
  price: number
  status: number
  users_id: number | null
  users_name: string | null
}

type Technician = {
  id: number
  name: string
  phone: string
  email: string
}

type Service = {
  id: number
  name: string
  price: number
  estimation: number
}

const BAG_CHECKLIST = [
  "Dust Bag",
  "Care Card/Card",
  "Tali panjang",
  "Tali pendek",
  "Tag Brand",
  "Price tag",
  "Receipt",
]

const SHOE_CHECKLIST = [
  "Tali Sepatu",
  "Kaos Kaki",
  "Box Sepatu",
]

export function EditOrderClient() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)

  const [note, setNote] = useState("")
  const [date, setDate] = useState("")

  // Item dialog
  const [services, setServices] = useState<Service[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null)
  const [assigningTreatment, setAssigningTreatment] = useState<number | null>(null)
  const [itemForm, setItemForm] = useState<any>({
    name: "",
    price: 0,
    discount: 0,
    type: 1,
    photo: "",
    note: "",
    services: [],
  })
  const [itemCheckList, setItemCheckList] = useState<boolean[]>([])
  const [serviceSearchOpen, setServiceSearchOpen] = useState<number | null>(null)
  const [assigningDelivery, setAssigningDelivery] = useState<number | null>(null)
  const [couriers, setCouriers] = useState<Technician[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState<number | null>(null)
  const [forcingComplete, setForcingComplete] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const quickPhotoInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})

  useEffect(() => {
    loadOrder()
    loadServices()
    loadTechnicians()
    loadCouriers()
  }, [orderId])

  async function loadOrder() {
    setLoading(true)
    try {
      const data = await api.get<Order>(`/api/orders/${orderId}`)
      setOrder(data)
      setNote(data.note || "")
      setDate(new Date(data.date * 1000).toISOString().split('T')[0])
    } catch (err: any) {
      toast.error("Gagal memuat data order")
      router.push("/pesanan")
    } finally {
      setLoading(false)
    }
  }

  async function loadServices() {
    try {
      const res = await api.get<any>("/api/services?per_page=100")
      if (res && res.data && Array.isArray(res.data)) {
        setServices(res.data)
      } else if (Array.isArray(res)) {
        setServices(res)
      }
    } catch {
      setServices([])
    }
  }

  async function loadTechnicians() {
    try {
      const res = await api.get<Technician[]>("/api/treatments/available-technicians")
      setTechnicians(res)
    } catch {
      setTechnicians([])
    }
  }

  async function loadCouriers() {
    try {
      const res = await api.get<Technician[]>("/api/sends/available-couriers")
      setCouriers(res)
    } catch {
      setCouriers([])
    }
  }

  async function handleAssignTechnician(treatmentId: number, userId: string) {
    if (!userId) return

    setAssigningTreatment(treatmentId)
    try {
      await api.post("/api/treatments/assign", {
        users_id: Number(userId),
        treatment_ids: [treatmentId],
      })
      toast.success("Teknisi berhasil di-assign")
      loadOrder() // Refresh order data
    } catch (err: any) {
      toast.error(err?.message || "Gagal assign teknisi")
    } finally {
      setAssigningTreatment(null)
    }
  }

  async function handleAssignDelivery(itemId: number, courierId: string) {
    if (!courierId) return

    setAssigningDelivery(itemId)
    try {
      await api.post("/api/sends", {
        type: 1, // delivery
        users_id: Number(courierId),
        orders_items_id: itemId,
        date: new Date().toISOString().split('T')[0],
        status: 0, // pending
      })
      toast.success("Kurir delivery berhasil di-assign")
      loadOrder() // Refresh order data
    } catch (err: any) {
      toast.error(err?.message || "Gagal assign kurir")
    } finally {
      setAssigningDelivery(null)
    }
  }

  async function handleQuickPhotoUpload(itemId: number, file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB.")
      return
    }

    setUploadingPhoto(itemId)
    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const base64Photo = reader.result as string

          // Find the item
          const item = order?.items.find(i => i.id === itemId)
          if (!item) {
            toast.error("Item tidak ditemukan")
            return
          }

          // Update item with new photo
          await api.post(`/api/orders/${orderId}/items`, {
            id: itemId,
            name: item.name,
            price: item.price,
            discount: item.discount,
            type: item.type,
            note: item.note,
            checkbox: item.checkbox,
            photo: base64Photo,
            services: item.treatments.map(t => ({
              id: t.id,
              services_id: t.services_id,
              price: t.price,
            })),
          })

          toast.success("Foto berhasil diupload")
          loadOrder() // Refresh order data
        } catch (err: any) {
          toast.error(err?.message || "Gagal upload foto")
        } finally {
          setUploadingPhoto(null)
        }
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      toast.error("Gagal membaca file")
      setUploadingPhoto(null)
    }
  }

  async function handleForceCompleteItem(item: OrderItem) {
    const result = await Swal.fire({
      title: 'Selesaikan Paksa?',
      html: `Item: <strong>${item.name}</strong><br/><br/>Semua treatment akan ditandai selesai dan item siap untuk delivery.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f97316',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Selesaikan',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return

    setForcingComplete(item.id)
    try {
      // Get all treatment IDs from this item
      const treatmentIds = item.treatments.map(t => t.id)

      if (treatmentIds.length === 0) {
        toast.error("Tidak ada treatment untuk diselesaikan")
        return
      }

      // Update all treatments to status = 2 (Done)
      await api.post("/api/treatments/force-complete", {
        treatment_ids: treatmentIds,
      })

      toast.success("Item berhasil diselesaikan paksa")
      loadOrder() // Refresh order data
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyelesaikan item")
    } finally {
      setForcingComplete(null)
    }
  }

  async function handleSaveOrder() {
    setSaving(true)
    try {
      await api.put(`/api/orders/${orderId}`, {
        date,
        note,
      })
      toast.success("Order berhasil diupdate")
      router.push(`/pesanan`)
    } catch (err: any) {
      toast.error(err?.message || "Gagal update order")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteItem(itemId: number) {
    const result = await Swal.fire({
      title: 'Hapus Item?',
      text: "Item akan dihapus secara permanen",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return

    try {
      await api.delete(`/api/orders/${orderId}/items/${itemId}`)
      toast.success("Item berhasil dihapus")
      loadOrder()
    } catch {
      toast.error("Gagal menghapus item")
    }
  }

  function openEditItem(item: OrderItem) {
    setEditingItem(item)
    setItemForm({
      id: item.id,
      name: item.name,
      price: item.price,
      discount: item.discount,
      type: item.type,
      photo: item.photo || "",
      note: item.note,
      services: item.treatments.map(t => ({
        id: t.id,
        services_id: t.services_id,
        price: t.price,
      })),
    })

    // Parse checkbox
    const checklistArr = item.checkbox ? item.checkbox.split(', ').map(v => v === 'true') : []
    const checklistSize = item.type === 1 ? BAG_CHECKLIST.length : SHOE_CHECKLIST.length
    setItemCheckList(checklistArr.length > 0 ? checklistArr : Array(checklistSize).fill(false))

    setItemDialogOpen(true)
  }

  function openAddItem() {
    setEditingItem(null)
    setItemForm({
      name: "",
      price: 0,
      discount: 0,
      type: 1,
      photo: "",
      note: "",
      services: [],
    })
    setItemCheckList(Array(BAG_CHECKLIST.length).fill(false))
    setItemDialogOpen(true)
  }

  async function saveItem() {
    if (!itemForm.name.trim()) {
      toast.error("Nama item wajib diisi")
      return
    }

    const checkboxStr = itemCheckList.map(v => v ? 'true' : 'false').join(', ')

    // Prepare data to send
    const dataToSend: any = {
      ...itemForm,
      checkbox: checkboxStr,
    }

    // Only send photo if it's a base64 string (new upload)
    // Don't send if it's a URL (existing photo)
    if (itemForm.photo && !itemForm.photo.startsWith('http')) {
      dataToSend.photo = itemForm.photo
    } else {
      // Remove photo field if it's existing URL
      delete dataToSend.photo
    }

    try {
      await api.post(`/api/orders/${orderId}/items`, dataToSend)
      toast.success("Item berhasil disimpan")
      setItemDialogOpen(false)
      loadOrder()
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan item")
    }
  }

  function addService() {
    setItemForm({
      ...itemForm,
      services: [...itemForm.services, { services_id: 0, price: 0 }]
    })
  }

  function updateService(index: number, serviceId: number) {
    const service = services.find(s => s.id === serviceId)
    if (!service) return

    const newServices = [...itemForm.services]
    newServices[index] = {
      services_id: serviceId,
      price: service.price
    }

    const totalServicePrice = newServices.reduce((sum, s) => sum + s.price, 0)
    setItemForm({ ...itemForm, services: newServices, price: totalServicePrice })
  }

  function removeService(index: number) {
    const newServices = itemForm.services.filter((_: any, i: number) => i !== index)
    const totalServicePrice = newServices.reduce((sum: number, s: any) => sum + s.price, 0)
    setItemForm({ ...itemForm, services: newServices, price: totalServicePrice })
  }

  function handleItemTypeChange(newType: string) {
    const type = Number(newType)
    setItemForm({ ...itemForm, type })

    if (type === 1) {
      setItemCheckList(Array(BAG_CHECKLIST.length).fill(false))
    } else if (type === 2) {
      setItemCheckList(Array(SHOE_CHECKLIST.length).fill(false))
    } else {
      setItemCheckList([])
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB.")
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setItemForm({ ...itemForm, photo: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  function formatCurrencyInput(value: number): string {
    if (!value || value === 0) return ''
    return new Intl.NumberFormat('id-ID').format(value)
  }

  function parseCurrencyInput(value: string): number {
    const cleaned = value.replace(/\D/g, '')
    return cleaned ? parseInt(cleaned, 10) : 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!order) {
    return null
  }

  const totalPrice = order.items.reduce((sum, item) => sum + item.price - item.discount, 0)
  const totalDiscount = order.items.reduce((sum, item) => sum + item.discount, 0)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/pesanan')}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Pesanan</h1>
          <p className="text-sm text-muted-foreground">{order.code}</p>
        </div>
      </div>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="font-medium">{order.customer?.name ?? "-"}</p>
            <p className="text-sm text-muted-foreground">{order.customer?.phone ?? "-"}</p>
            <p className="text-sm text-muted-foreground">{order.customer?.address ?? "-"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Order Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi Pesanan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date">Tanggal Order <span className="text-destructive">*</span></Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Catatan</Label>
            <Textarea
              id="note"
              placeholder="Catatan tambahan..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Item Pesanan</CardTitle>
            <Button size="sm" onClick={openAddItem} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Tambah Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada item
            </div>
          ) : (
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {item.photo ? (
                      <img
                        src={item.photo}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg object-cover border"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border text-xs text-muted-foreground">
                        No Photo
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">#{idx + 1}: {item.name}</div>
                          {item.note && (
                            <div className="text-xs text-muted-foreground mt-1">{item.note}</div>
                          )}

                          {/* Delivery Courier - Show only if all treatments are done */}
                          {item.treatments.length > 0 && item.treatments.every(t => t.status === 2) && (
                            <div className="mt-2">
                              {item.delivery_courier_name ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 border border-green-200 text-xs font-medium text-green-700">
                                  <UserCog className="h-3 w-3" />
                                  <span>Kurir: {item.delivery_courier_name}</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-2">
                                  <UserCog className="h-3.5 w-3.5 text-green-700" />
                                  <Select
                                    value=""
                                    onValueChange={(value) => handleAssignDelivery(item.id, value)}
                                    disabled={assigningDelivery === item.id}
                                  >
                                    <SelectTrigger className="h-7 text-xs w-40 bg-green-50 border-green-200">
                                      <SelectValue placeholder="Pilih Kurir" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {couriers.map((courier) => (
                                        <SelectItem key={courier.id} value={String(courier.id)}>
                                          {courier.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {assigningDelivery === item.id && (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-green-700" />
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold text-sm">{formatCurrency(item.price)}</div>
                          {item.discount > 0 && (
                            <div className="text-xs text-destructive">-{formatCurrency(item.discount)}</div>
                          )}
                        </div>
                      </div>

                      {item.treatments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Layanan</div>
                          {item.treatments.map((treatment) => (
                            <div key={treatment.id} className="border border-border/50 bg-card rounded-lg p-3 space-y-2.5">
                              {/* Header Layanan */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{treatment.name}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">{formatCurrency(treatment.price)}</div>
                                </div>
                                {treatment.users_name && (
                                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 ${
                                    treatment.status === 0 ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                    treatment.status === 1 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    treatment.status === 2 ? 'bg-green-50 text-green-700 border border-green-200' :
                                    'bg-gray-50 text-gray-700 border border-gray-200'
                                  }`}>
                                    {treatment.status === 0 ? 'Waiting' :
                                     treatment.status === 1 ? 'Process' :
                                     treatment.status === 2 ? 'Done' : 'Unknown'}
                                  </span>
                                )}
                              </div>

                              {/* Teknisi Section */}
                              <div className="pt-2 border-t border-border/50">
                                {treatment.status === 0 && !treatment.users_id ? (
                                  <div className="flex items-center gap-2">
                                    <UserCog className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <Select
                                      value=""
                                      onValueChange={(value) => handleAssignTechnician(treatment.id, value)}
                                      disabled={assigningTreatment === treatment.id}
                                    >
                                      <SelectTrigger className="h-8 text-xs flex-1">
                                        <SelectValue placeholder="Pilih Teknisi" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {technicians.map((tech) => (
                                          <SelectItem key={tech.id} value={String(tech.id)}>
                                            {tech.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {assigningTreatment === treatment.id && (
                                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                                    )}
                                  </div>
                                ) : treatment.users_name ? (
                                  <div className="flex items-center gap-2 text-sm">
                                    <UserCog className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Teknisi:</span>
                                    <span className="font-medium">{treatment.users_name}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        <input
                          ref={(el) => {
                            quickPhotoInputRefs.current[item.id] = el
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleQuickPhotoUpload(item.id, file)
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditItem(item)}
                          className="h-7 text-xs"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => quickPhotoInputRefs.current[item.id]?.click()}
                          disabled={uploadingPhoto === item.id}
                          className="h-7 text-xs gap-1"
                        >
                          {uploadingPhoto === item.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          {uploadingPhoto === item.id ? 'Uploading...' : 'Upload Foto'}
                        </Button>
                        {item.treatments.length > 0 && !item.treatments.every(t => t.status === 2) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleForceCompleteItem(item)}
                            disabled={forcingComplete === item.id}
                            className="h-7 text-xs gap-1 text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400"
                          >
                            {forcingComplete === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Selesaikan Paksa
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="h-7 text-xs text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Hapus
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          {order.items.length > 0 && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(totalPrice + totalDiscount)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Diskon</span>
                  <span className="font-medium text-destructive">-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">{formatCurrency(totalPrice)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/pesanan')}
          disabled={saving}
        >
          Batal
        </Button>
        <Button
          onClick={handleSaveOrder}
          disabled={saving}
          className="gap-1.5"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan Perubahan
        </Button>
      </div>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Tambah Item"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Photo */}
            <div className="flex flex-col items-center gap-3">
              {itemForm.photo ? (
                <img
                  src={itemForm.photo}
                  alt="Preview"
                  className="h-32 w-32 rounded-lg object-cover border"
                  loading="lazy"
                />
              ) : (
                <div className="h-32 w-32 rounded-lg bg-muted flex items-center justify-center border">
                  <span className="text-xs text-muted-foreground">No Photo</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {itemForm.photo ? "Ganti Foto" : "Upload Foto"}
                </Button>
                {itemForm.photo && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setItemForm({ ...itemForm, photo: "" })
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                    className="gap-1.5 text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                    Hapus
                  </Button>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="item-name">Nama Item <span className="text-destructive">*</span></Label>
              <Input
                id="item-name"
                placeholder="Contoh: Sepatu Nike Air Max"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Jenis Item</Label>
              <RadioGroup
                value={String(itemForm.type)}
                onValueChange={handleItemTypeChange}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="type-bag" />
                  <Label htmlFor="type-bag" className="font-normal cursor-pointer">Tas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="type-shoe" />
                  <Label htmlFor="type-shoe" className="font-normal cursor-pointer">Sepatu</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="0" id="type-other" />
                  <Label htmlFor="type-other" className="font-normal cursor-pointer">Lainnya</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Checklist */}
            {(itemForm.type === 1 || itemForm.type === 2) && (
              <div className="space-y-2 border rounded-lg p-3">
                <Label className="text-sm font-medium">
                  Kelengkapan {itemForm.type === 1 ? 'Tas' : 'Sepatu'}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(itemForm.type === 1 ? BAG_CHECKLIST : SHOE_CHECKLIST).map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <Checkbox
                        id={`check-${idx}`}
                        checked={itemCheckList[idx] || false}
                        onCheckedChange={(checked) => {
                          const newList = [...itemCheckList]
                          newList[idx] = checked === true
                          setItemCheckList(newList)
                        }}
                      />
                      <Label htmlFor={`check-${idx}`} className="text-sm font-normal cursor-pointer">
                        {item}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Layanan</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addService}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Tambah Layanan
                </Button>
              </div>

              {itemForm.services.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                  Belum ada layanan
                </div>
              ) : (
                <div className="space-y-3">
                  {itemForm.services.map((svc: any, idx: number) => {
                    const selectedService = services.find(s => s.id === svc.services_id)
                    // Cari treatment yang sudah punya users_id dari data order item yang sedang di-edit
                    const existingTreatment = editingItem?.treatments.find(t => t.services_id === svc.services_id)
                    const hasAssignedTechnician = existingTreatment?.users_id

                    return (
                      <div key={idx} className="border rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <Popover open={serviceSearchOpen === idx} onOpenChange={(open) => setServiceSearchOpen(open ? idx : null)}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between h-9"
                                  disabled={!!hasAssignedTechnician}
                                >
                                  {selectedService ? (
                                    <span className="truncate">{selectedService.name} - {formatCurrency(selectedService.price)}</span>
                                  ) : (
                                    <span className="text-muted-foreground">Pilih layanan...</span>
                                  )}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Cari layanan..." />
                                  <CommandList>
                                    <CommandEmpty>Layanan tidak ditemukan.</CommandEmpty>
                                    <CommandGroup>
                                      {services.map((service) => (
                                        <CommandItem
                                          key={service.id}
                                          value={`${service.name} ${service.id}`}
                                          onSelect={() => {
                                            updateService(idx, service.id)
                                            setServiceSearchOpen(null)
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              svc.services_id === service.id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          <div className="flex-1">
                                            <div className="font-medium">{service.name}</div>
                                            <div className="text-xs text-muted-foreground">{formatCurrency(service.price)} • {service.estimation} hari</div>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeService(idx)}
                            className="h-9 w-9 text-destructive hover:text-destructive shrink-0"
                            disabled={!!hasAssignedTechnician}
                            title={hasAssignedTechnician ? "Tidak bisa dihapus, sudah ada teknisi" : "Hapus layanan"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Price & Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="item-price">Harga</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                  <Input
                    id="item-price"
                    type="text"
                    placeholder="0"
                    className="pl-10"
                    value={formatCurrencyInput(itemForm.price)}
                    onChange={(e) => setItemForm({ ...itemForm, price: parseCurrencyInput(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-discount">Diskon</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                  <Input
                    id="item-discount"
                    type="text"
                    placeholder="0"
                    className="pl-10"
                    value={formatCurrencyInput(itemForm.discount)}
                    onChange={(e) => setItemForm({ ...itemForm, discount: parseCurrencyInput(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="item-note">Catatan</Label>
              <Textarea
                id="item-note"
                placeholder="Catatan untuk item ini..."
                value={itemForm.note}
                onChange={(e) => setItemForm({ ...itemForm, note: e.target.value })}
                rows={2}
              />
            </div>

            {/* Summary */}
            <div className="border-t pt-4">
              <div className="flex justify-between">
                <span className="font-medium">Total Item</span>
                <span className="font-bold">{formatCurrency(itemForm.price - itemForm.discount)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setItemDialogOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              onClick={saveItem}
              className="flex-1"
            >
              {editingItem ? "Simpan Perubahan" : "Tambah Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
