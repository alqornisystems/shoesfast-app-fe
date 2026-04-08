"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Search, Loader2, Camera, X, ChevronLeft, ChevronRight, Calculator } from "lucide-react"
import { api } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
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
  DialogClose,
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
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type Service = {
  id: number
  name: string
  price: number
  hpp: number
  estimation: number
  photo: string | null
  description: string | null
}

type FormState = {
  name: string
  price: string
  hpp: string
  estimation: string
  photo: string
  description: string
}

type ErrorState = Partial<Record<keyof FormState, string>>

const emptyForm: FormState = {
  name: "",
  price: "",
  hpp: "",
  estimation: "",
  photo: "",
  description: "",
}

type PaginationData = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

export function ServiceClient() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
    from: 0,
    to: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Service | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<ErrorState>({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchServices(page = 1, searchQuery = search) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: '25',
      })
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      const json = await api.get<any>(`/api/services?${params.toString()}`)
      setServices(json.data ?? [])
      setPagination({
        current_page: json.current_page ?? 1,
        last_page: json.last_page ?? 1,
        per_page: json.per_page ?? 25,
        total: json.total ?? 0,
        from: json.from ?? 0,
        to: json.to ?? 0,
      })
    } catch {
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchServices(1, search)
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(service: Service) {
    setEditTarget(service)
    setForm({
      name: service.name,
      price: String(service.price),
      hpp: String(service.hpp),
      estimation: String(service.estimation),
      photo: service.photo || "",
      description: service.description || "",
    })
    setErrors({})
    setDialogOpen(true)
  }

  async function handleSave() {
    const errs: ErrorState = {}
    if (!form.name.trim()) errs.name = "Nama layanan wajib diisi."
    if (!form.price.trim()) errs.price = "Harga wajib diisi."
    if (!form.hpp.trim()) errs.hpp = "HPP wajib diisi."
    if (!form.estimation.trim()) errs.estimation = "Estimasi pengerjaan wajib diisi."

    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setSaving(true)
    setErrors({})
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        hpp: Number(form.hpp),
        estimation: Number(form.estimation),
        photo: form.photo || null,
        description: form.description.trim() || null,
      }

      if (editTarget) {
        await api.put(`/api/services/${editTarget.id}`, payload)
      } else {
        await api.post("/api/services", payload)
      }

      setDialogOpen(false)
      fetchServices(pagination.current_page)
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]> }
      if (e?.errors) {
        const apiErrs: ErrorState = {}
        Object.keys(e.errors).forEach((key) => {
          apiErrs[key as keyof FormState] = e.errors![key][0]
        })
        setErrors(apiErrs)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/services/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchServices(pagination.current_page)
    } finally {
      setDeleting(false)
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setForm({ ...form, photo: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Layanan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data layanan Shoesfast.
          </p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Layanan
        </Button>
      </div>

      {/* Table card */}
      <div className="rounded-xl border bg-card shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari layanan..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="ml-auto">
            {pagination.total} layanan
          </Badge>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center hidden md:table-cell">#</TableHead>
              <TableHead>Layanan</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Harga</TableHead>
              <TableHead className="hidden lg:table-cell text-right">HPP</TableHead>
              <TableHead className="hidden xl:table-cell text-right">Estimasi (hari)</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Belum ada data layanan.
                </TableCell>
              </TableRow>
            ) : (
              services.map((service, idx) => (
                <TableRow key={service.id}>
                  <TableCell className="text-center text-muted-foreground text-sm hidden md:table-cell">
                    {pagination.from + idx}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 rounded-md">
                        <AvatarImage src={service.photo || undefined} className="object-cover" />
                        <AvatarFallback className="text-xs font-semibold rounded-md">
                          {service.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium">{service.name}</div>
                        {service.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {service.description}
                          </div>
                        )}
                        {/* Mobile view */}
                        <div className="flex items-center gap-2 mt-1 lg:hidden text-xs text-muted-foreground">
                          <span>{formatCurrency(service.price)}</span>
                          <span>•</span>
                          <span>HPP {formatCurrency(service.hpp)}</span>
                          <span>•</span>
                          <span>{service.estimation} hari</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-right hidden lg:table-cell font-medium">
                    {formatCurrency(service.price)}
                  </TableCell>
                  <TableCell className="text-sm text-right hidden lg:table-cell text-muted-foreground">
                    {formatCurrency(service.hpp)}
                  </TableCell>
                  <TableCell className="text-sm text-right hidden xl:table-cell">
                    {service.estimation} hari
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => router.push(`/layanan/${service.id}`)}
                        title="Kelola HPP"
                      >
                        <Calculator className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(service)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(service)}
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
              Menampilkan {pagination.from} - {pagination.to} dari {pagination.total} layanan
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchServices(pagination.current_page - 1)}
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
                onClick={() => fetchServices(pagination.current_page + 1)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Layanan" : "Tambah Layanan"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Photo */}
            <div className="space-y-2">
              <Label>Foto Layanan</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 rounded-md border-2">
                  <AvatarImage src={form.photo || undefined} className="object-cover" />
                  <AvatarFallback className="text-lg font-bold rounded-md">
                    {form.name ? form.name.slice(0, 2).toUpperCase() : "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => document.getElementById("photo-upload")?.click()}
                  >
                    <Camera className="h-4 w-4" />
                    Upload Foto
                  </Button>
                  {form.photo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...form, photo: "" })}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama Layanan <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  placeholder="Contoh: Deep Clean"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value })
                    setErrors({ ...errors, name: undefined })
                  }}
                  className={cn(errors.name && "border-destructive")}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="price">Harga (Rp) <span className="text-destructive">*</span></Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    placeholder="50000"
                    value={form.price}
                    onChange={(e) => {
                      setForm({ ...form, price: e.target.value })
                      setErrors({ ...errors, price: undefined })
                    }}
                    className={cn(errors.price && "border-destructive")}
                  />
                  {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hpp">HPP (Rp) <span className="text-destructive">*</span></Label>
                  <Input
                    id="hpp"
                    type="number"
                    min="0"
                    placeholder="30000"
                    value={form.hpp}
                    onChange={(e) => {
                      setForm({ ...form, hpp: e.target.value })
                      setErrors({ ...errors, hpp: undefined })
                    }}
                    className={cn(errors.hpp && "border-destructive")}
                  />
                  {errors.hpp && <p className="text-xs text-destructive">{errors.hpp}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="estimation">Estimasi Pengerjaan (hari) <span className="text-destructive">*</span></Label>
                <Input
                  id="estimation"
                  type="number"
                  min="0"
                  placeholder="3"
                  value={form.estimation}
                  onChange={(e) => {
                    setForm({ ...form, estimation: e.target.value })
                    setErrors({ ...errors, estimation: undefined })
                  }}
                  className={cn(errors.estimation && "border-destructive")}
                />
                {errors.estimation && <p className="text-xs text-destructive">{errors.estimation}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  placeholder="Deskripsi layanan (opsional)"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>Batal</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTarget ? "Simpan Perubahan" : "Tambah Layanan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Layanan?</AlertDialogTitle>
            <AlertDialogDescription>
              Layanan <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span> akan dihapus.
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
    </div>
  )
}
