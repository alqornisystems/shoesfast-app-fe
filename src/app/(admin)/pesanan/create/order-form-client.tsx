"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Loader2, Search, Upload, X, User, UserPlus } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

type Customer = {
  id: number
  name: string
  phone: string
  email: string | null
  address: string
}

type Service = {
  id: number
  name: string
  price: number
  estimation: number
}

type OrderItem = {
  tempId: string
  name: string
  price: number
  discount: number
  type: number // 0=Lainnya, 1=Tas, 2=Sepatu
  photo: string
  note: string
  checkbox: string // Checklist kelengkapan (serialized)
  services: {
    services_id: number
    price: number
  }[]
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

type FormState = {
  customers_id: number | null
  date: string
  note: string
  items: OrderItem[]
}

export function OrderFormClient() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    customers_id: null,
    date: new Date().toISOString().split('T')[0],
    note: "",
    items: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Customer search
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [loadingCustomers, setLoadingCustomers] = useState(false)

  // Customer creation
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", address: "" })
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  // Service search
  const [services, setServices] = useState<Service[]>([])

  // Item dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null)
  const [itemForm, setItemForm] = useState<OrderItem>({
    tempId: "",
    name: "",
    price: 0,
    discount: 0,
    type: 1,
    photo: "",
    note: "",
    checkbox: "",
    services: [],
  })
  const [itemCheckList, setItemCheckList] = useState<boolean[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Search customers
  async function searchCustomers(query: string) {
    setLoadingCustomers(true)
    try {
      const res = await api.get<any>(`/api/orders/search/customers?search=${query}`)
      // The search endpoint returns array directly
      if (Array.isArray(res)) {
        setCustomers(res)
      } else if (res && res.data && Array.isArray(res.data)) {
        setCustomers(res.data)
      } else {
        setCustomers([])
      }
    } catch {
      setCustomers([])
    } finally {
      setLoadingCustomers(false)
    }
  }

  // Load recent customers when opening dialog
  async function loadRecentCustomers() {
    setLoadingCustomers(true)
    try {
      const res = await api.get<any>(`/api/customers?per_page=5&sort=created_at&order=desc`)
      // Handle paginated response
      if (res && res.data && Array.isArray(res.data)) {
        setCustomers(res.data)
      } else if (Array.isArray(res)) {
        setCustomers(res)
      } else {
        setCustomers([])
      }
    } catch {
      setCustomers([])
    } finally {
      setLoadingCustomers(false)
    }
  }

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer)
    setForm({ ...form, customers_id: customer.id })
    setCustomerSearchOpen(false)
    setErrors({ ...errors, customers_id: "" })
  }

  // Create new customer
  async function handleCreateCustomer() {
    if (!newCustomer.name.trim()) {
      toast.error("Nama customer wajib diisi")
      return
    }
    if (!newCustomer.phone.trim()) {
      toast.error("Nomor telepon wajib diisi")
      return
    }

    setCreatingCustomer(true)
    try {
      const created = await api.post<Customer>("/api/customers", newCustomer)
      toast.success("Customer berhasil ditambahkan")
      selectCustomer(created)
      setCreateCustomerOpen(false)
      setNewCustomer({ name: "", phone: "", email: "", address: "" })
    } catch (err: any) {
      toast.error(err?.message || "Gagal menambahkan customer")
    } finally {
      setCreatingCustomer(false)
    }
  }

  // Search services
  async function searchServices(query: string) {
    try {
      const res = await api.get<any>(`/api/services?search=${query}&per_page=100`)
      // Handle paginated response
      if (res && res.data && Array.isArray(res.data)) {
        setServices(res.data)
      } else if (Array.isArray(res)) {
        setServices(res)
      } else {
        setServices([])
      }
    } catch {
      setServices([])
    }
  }

  // Item management
  function openAddItem() {
    setEditingItem(null)
    setItemForm({
      tempId: `temp-${Date.now()}`,
      name: "",
      price: 0,
      discount: 0,
      type: 1,
      photo: "",
      note: "",
      checkbox: "",
      services: [],
    })
    setItemCheckList(Array(BAG_CHECKLIST.length).fill(false))
    setItemDialogOpen(true)
    if (services.length === 0) {
      searchServices("")
    }
  }

  function openEditItem(item: OrderItem) {
    setEditingItem(item)
    setItemForm({ ...item })

    // Parse checkbox
    const checklistArr = item.checkbox ? item.checkbox.split(', ').map(v => v === 'true') : []
    const checklistSize = item.type === 1 ? BAG_CHECKLIST.length : SHOE_CHECKLIST.length
    setItemCheckList(checklistArr.length > 0 ? checklistArr : Array(checklistSize).fill(false))

    setItemDialogOpen(true)
    if (services.length === 0) {
      searchServices("")
    }
  }

  function removeItem(tempId: string) {
    setForm({
      ...form,
      items: form.items.filter(i => i.tempId !== tempId)
    })
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file maksimal 2MB.")
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setItemForm({ ...itemForm, photo: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  function addService() {
    if (!itemForm.services.length) {
      setItemForm({
        ...itemForm,
        services: [{ services_id: 0, price: 0 }]
      })
    } else {
      setItemForm({
        ...itemForm,
        services: [...itemForm.services, { services_id: 0, price: 0 }]
      })
    }
  }

  function updateService(index: number, serviceId: number) {
    const service = services.find(s => s.id === serviceId)
    if (!service) return

    const newServices = [...itemForm.services]
    newServices[index] = {
      services_id: serviceId,
      price: service.price
    }
    setItemForm({ ...itemForm, services: newServices })

    // Calculate total price
    const totalServicePrice = newServices.reduce((sum, s) => sum + s.price, 0)
    setItemForm({ ...itemForm, services: newServices, price: totalServicePrice })
  }

  function removeService(index: number) {
    const newServices = itemForm.services.filter((_, i) => i !== index)
    setItemForm({ ...itemForm, services: newServices })

    // Recalculate price
    const totalServicePrice = newServices.reduce((sum, s) => sum + s.price, 0)
    setItemForm({ ...itemForm, price: totalServicePrice })
  }

  function saveItem() {
    if (!itemForm.name.trim()) {
      toast.error("Nama item wajib diisi")
      return
    }

    // Serialize checkbox
    const checkboxStr = itemCheckList.map(v => v ? 'true' : 'false').join(', ')
    const itemToSave = { ...itemForm, checkbox: checkboxStr }

    if (editingItem) {
      setForm({
        ...form,
        items: form.items.map(i => i.tempId === editingItem.tempId ? itemToSave : i)
      })
    } else {
      setForm({
        ...form,
        items: [...form.items, itemToSave]
      })
    }

    toast.success(editingItem ? "Item berhasil diupdate" : "Item berhasil ditambahkan")
    setItemDialogOpen(false)
  }

  // Handle item type change
  function handleItemTypeChange(newType: string) {
    const type = Number(newType)
    setItemForm({ ...itemForm, type })

    // Reset checklist based on new type
    if (type === 1) {
      setItemCheckList(Array(BAG_CHECKLIST.length).fill(false))
    } else if (type === 2) {
      setItemCheckList(Array(SHOE_CHECKLIST.length).fill(false))
    } else {
      setItemCheckList([])
    }
  }

  async function handleSubmit() {
    const errs: Record<string, string> = {}
    if (!form.customers_id) errs.customers_id = "Customer wajib dipilih"
    if (!form.date) errs.date = "Tanggal wajib diisi"
    // Item tidak wajib diisi, bisa dibuat order kosong dulu

    if (Object.keys(errs).length) {
      setErrors(errs)
      toast.error("Mohon lengkapi form")
      return
    }

    setSaving(true)
    setErrors({})

    try {
      const payload = {
        customers_id: form.customers_id,
        date: form.date,
        note: form.note,
        items: form.items.map(item => ({
          name: item.name,
          price: item.price,
          discount: item.discount,
          type: item.type,
          photo: item.photo || null,
          note: item.note || null,
          checkbox: item.checkbox || null,
          services: item.services.filter(s => s.services_id > 0).map(s => ({
            services_id: s.services_id,
            price: s.price,
          }))
        }))
      }

      await api.post("/api/orders", payload)
      toast.success("Pesanan berhasil dibuat!")
      router.push("/pesanan")
    } catch (err: any) {

      if (err?.errors) {
        setErrors(err.errors)
      }
      toast.error(err?.message || "Gagal membuat pesanan. Silakan coba lagi.")
    } finally {
      setSaving(false)
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const totalPrice = form.items.reduce((sum, item) => sum + item.price - item.discount, 0)
  const totalDiscount = form.items.reduce((sum, item) => sum + item.discount, 0)

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
          <h1 className="text-2xl font-bold tracking-tight">Buat Pesanan Baru</h1>
          <p className="text-sm text-muted-foreground">Tambahkan pesanan layanan baru</p>
        </div>
      </div>

      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCustomer ? (
            <div className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">{selectedCustomer.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedCustomer.phone}</div>
                  <div className="text-sm text-muted-foreground">{selectedCustomer.address}</div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCustomer(null)
                  setForm({ ...form, customers_id: null })
                  setCustomerSearchOpen(true)
                  loadRecentCustomers()
                }}
              >
                Ganti
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setCustomerSearchOpen(true)
                loadRecentCustomers()
              }}
            >
              <Search className="h-4 w-4 mr-2" />
              Pilih Customer
            </Button>
          )}
          {errors.customers_id && <p className="text-xs text-destructive">{errors.customers_id}</p>}
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
                value={form.date}
                onChange={(e) => {
                  setForm({ ...form, date: e.target.value })
                  const { date, ...restErrors } = errors
                  setErrors(restErrors)
                }}
                className={cn(errors.date && "border-destructive")}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Catatan</Label>
            <Textarea
              id="note"
              placeholder="Catatan tambahan..."
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
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
          {form.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada item. Klik "Tambah Item" untuk menambahkan.
            </div>
          ) : (
            <div className="space-y-3">
              {form.items.map((item, idx) => (
                <div key={item.tempId} className="border rounded-lg p-4 space-y-3">
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
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold text-sm">{formatCurrency(item.price)}</div>
                          {item.discount > 0 && (
                            <div className="text-xs text-destructive">-{formatCurrency(item.discount)}</div>
                          )}
                        </div>
                      </div>

                      {item.services.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Layanan:</div>
                          {item.services.map((svc, svcIdx) => {
                            const service = services.find(s => s.id === svc.services_id)
                            return (
                              <div key={svcIdx} className="flex items-center justify-between text-xs bg-muted/30 px-2 py-1 rounded">
                                <span>{service?.name || `Service #${svc.services_id}`}</span>
                                <span className="text-muted-foreground">{formatCurrency(svc.price)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditItem(item)}
                          className="h-7 text-xs"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.tempId)}
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
          {errors.items && <p className="text-xs text-destructive">{errors.items}</p>}

          {/* Summary */}
          {form.items.length > 0 && (
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
          onClick={handleSubmit}
          disabled={saving}
          className="gap-1.5"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Buat Pesanan
        </Button>
      </div>

      {/* Customer Search Dialog */}
      <Dialog open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Customer</DialogTitle>
            {!customerSearch && customers.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Menampilkan 5 customer terbaru
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama / telepon..."
                className="pl-8"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  if (e.target.value.trim()) {
                    searchCustomers(e.target.value)
                  } else {
                    loadRecentCustomers()
                  }
                }}
                autoFocus
              />
            </div>

            {/* Tombol Tambah Customer Baru di Atas */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCustomerSearchOpen(false)
                setCreateCustomerOpen(true)
              }}
              className="w-full gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Tambah Customer Baru
            </Button>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {loadingCustomers ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    {customerSearch.trim() ? "Customer tidak ditemukan" : "Belum ada customer"}
                  </p>
                </div>
              ) : (
                <>
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => selectCustomer(customer)}
                      className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">{customer.phone}</div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Customer Dialog */}
      <Dialog open={createCustomerOpen} onOpenChange={setCreateCustomerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Customer Baru</DialogTitle>
            <DialogDescription>
              Isi data customer yang akan ditambahkan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name">Nama <span className="text-destructive">*</span></Label>
              <Input
                id="cust-name"
                placeholder="Nama customer"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-phone">Telepon <span className="text-destructive">*</span></Label>
              <Input
                id="cust-phone"
                type="tel"
                placeholder="08123456789"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-email">Email</Label>
              <Input
                id="cust-email"
                type="email"
                placeholder="email@example.com"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-address">Alamat <span className="text-destructive">*</span></Label>
              <Textarea
                id="cust-address"
                placeholder="Alamat lengkap"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateCustomerOpen(false)}
              disabled={creatingCustomer}
            >
              Batal
            </Button>
            <Button
              onClick={handleCreateCustomer}
              disabled={creatingCustomer}
              className="gap-1.5"
            >
              {creatingCustomer && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

            {/* Checklist Kelengkapan */}
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
                      <Label
                        htmlFor={`check-${idx}`}
                        className="text-sm font-normal cursor-pointer"
                      >
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
                  Belum ada layanan. Klik "Tambah Layanan".
                </div>
              ) : (
                <div className="space-y-2">
                  {itemForm.services.map((svc, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Select
                        value={String(svc.services_id)}
                        onValueChange={(v) => updateService(idx, Number(v))}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Pilih layanan" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={String(service.id)}>
                              {service.name} - {formatCurrency(service.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeService(idx)}
                        className="h-9 w-9 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price & Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="item-price">Harga</Label>
                <Input
                  id="item-price"
                  type="number"
                  placeholder="0"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-discount">Diskon</Label>
                <Input
                  id="item-discount"
                  type="number"
                  placeholder="0"
                  value={itemForm.discount}
                  onChange={(e) => setItemForm({ ...itemForm, discount: Number(e.target.value) })}
                />
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
