"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Search, Loader2, Camera, X, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { api } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { MapPicker } from "@/components/map-picker"
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

type Customer = {
  id: number
  name: string
  phone: string
  address: string | null
  email: string | null
  instagram: string | null
  photo: string | null
  maps: string | null
  date_of_birth: number | null
  hobby: string | null
  favorite_food: string | null
  behavior: string | null
  is_member?: number
  member_code?: string | null
  member_since?: string | null
  points?: number
  project_ids?: number[]
  project_names?: string[]
}

type Project = {
  id: number
  name: string
}

type FormState = {
  name: string
  phone: string
  address: string
  email: string
  instagram: string
  photo: string
  maps: string
  date_of_birth: string
  hobby: string
  favorite_food: string
  behavior: string
  is_member: boolean
  member_code: string
  member_since: string
  points: string
  project_ids: number[]
}

type ErrorState = Partial<Record<keyof FormState, string>>

const emptyForm: FormState = {
  name: "",
  phone: "",
  address: "",
  email: "",
  instagram: "",
  photo: "",
  maps: "",
  date_of_birth: "",
  hobby: "",
  favorite_food: "",
  behavior: "",
  is_member: false,
  member_code: "",
  member_since: "",
  points: "0",
  project_ids: [],
}

type PaginationData = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

export function CustomerClient() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [projects, setProjects] = useState<Project[]>([])
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
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<ErrorState>({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchCustomers(page = 1, searchQuery = search) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: '25',
      })
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      const json = await api.get<any>(`/api/customers?${params.toString()}`)
      setCustomers(json.data ?? [])
      setPagination({
        current_page: json.current_page ?? 1,
        last_page: json.last_page ?? 1,
        per_page: json.per_page ?? 25,
        total: json.total ?? 0,
        from: json.from ?? 0,
        to: json.to ?? 0,
      })
    } catch {
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchProjects() {
    try {
      const json = await api.get<any>("/api/projects")
      setProjects(json.data ?? [])
    } catch {
      setProjects([])
    }
  }

  useEffect(() => {
    fetchCustomers()
    fetchProjects()
  }, [])

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(1, search)
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(customer: Customer) {
    setEditTarget(customer)
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      address: customer.address || "",
      email: customer.email || "",
      instagram: customer.instagram || "",
      photo: customer.photo || "",
      maps: customer.maps || "",
      date_of_birth: customer.date_of_birth ? String(customer.date_of_birth) : "",
      hobby: customer.hobby || "",
      favorite_food: customer.favorite_food || "",
      behavior: customer.behavior || "",
      is_member: customer.is_member === 1,
      member_code: customer.member_code || "",
      member_since: customer.member_since || "",
      points: customer.points ? String(customer.points) : "0",
      project_ids: customer.project_ids || [],
    })
    setErrors({})
    setDialogOpen(true)
  }

  async function handleSave() {
    const errs: ErrorState = {}
    if (!form.name.trim()) errs.name = "Nama wajib diisi."
    if (!form.phone.trim()) errs.phone = "Nomor telepon wajib diisi."

    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setSaving(true)
    setErrors({})
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
        email: form.email.trim() || null,
        instagram: form.instagram.trim() || null,
        photo: form.photo || null,
        maps: form.maps.trim() || null,
        date_of_birth: form.date_of_birth ? Number(form.date_of_birth) : null,
        hobby: form.hobby.trim() || null,
        favorite_food: form.favorite_food.trim() || null,
        behavior: form.behavior.trim() || null,
        is_member: form.is_member,
        member_code: form.member_code.trim() || null,
        member_since: form.member_since || null,
        points: form.points ? Number(form.points) : 0,
        project_ids: form.project_ids,
      }

      if (editTarget) {
        await api.put(`/api/customers/${editTarget.id}`, payload)
      } else {
        await api.post("/api/customers", payload)
      }

      setDialogOpen(false)
      fetchCustomers(pagination.current_page)
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
      await api.delete(`/api/customers/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchCustomers(pagination.current_page)
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

  function formatDate(unix: number | null) {
    if (!unix) return "-"
    return new Date(unix * 1000).toLocaleDateString("id-ID")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pelanggan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data pelanggan Shoesfast.
          </p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Pelanggan
        </Button>
      </div>

      {/* Table card */}
      <div className="rounded-xl border bg-card shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari pelanggan..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="ml-auto">
            {pagination.total} pelanggan
          </Badge>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center hidden md:table-cell">#</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead className="hidden lg:table-cell">Telepon</TableHead>
              <TableHead className="hidden xl:table-cell">Alamat</TableHead>
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
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Belum ada data pelanggan.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer, idx) => (
                <TableRow key={customer.id}>
                  <TableCell className="text-center text-muted-foreground text-sm hidden md:table-cell">
                    {pagination.from + idx}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={customer.photo || undefined} />
                        <AvatarFallback className="text-xs font-semibold">
                          {customer.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{customer.name}</span>
                          {customer.is_member === 1 && (
                            <Badge variant="default" className="text-xs py-0 h-5">
                              Member
                            </Badge>
                          )}
                        </div>
                        {customer.email && (
                          <div className="text-xs text-muted-foreground truncate">{customer.email}</div>
                        )}
                        <div className="text-xs text-muted-foreground lg:hidden mt-0.5">
                          {customer.phone}
                        </div>
                        {customer.project_names && customer.project_names.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {customer.project_names.map((name, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs py-0 h-5">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm hidden lg:table-cell">{customer.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate hidden xl:table-cell">
                    {customer.address || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(customer)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(customer)}
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
              Menampilkan {pagination.from} - {pagination.to} dari {pagination.total} pelanggan
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCustomers(pagination.current_page - 1)}
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
                onClick={() => fetchCustomers(pagination.current_page + 1)}
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Pelanggan" : "Tambah Pelanggan"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Photo */}
            <div className="space-y-2">
              <Label>Foto Profil</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2">
                  <AvatarImage src={form.photo || undefined} />
                  <AvatarFallback className="text-lg font-bold">
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

            {/* Informasi Utama */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Informasi Utama
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="name">Nama Lengkap <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  placeholder="Nama pelanggan"
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
                  <Label htmlFor="phone">Nomor Telepon <span className="text-destructive">*</span></Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08xxx"
                    value={form.phone}
                    onChange={(e) => {
                      const filtered = e.target.value.replace(/\D/g, "")
                      setForm({ ...form, phone: filtered })
                      setErrors({ ...errors, phone: undefined })
                    }}
                    className={cn(errors.phone && "border-destructive")}
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  placeholder="@username atau https://instagram.com/username"
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tanggal Lahir</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.date_of_birth && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.date_of_birth
                        ? format(new Date(Number(form.date_of_birth) * 1000), "PPP", { locale: id })
                        : "Pilih tanggal lahir"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.date_of_birth ? new Date(Number(form.date_of_birth) * 1000) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const unixTimestamp = Math.floor(date.getTime() / 1000)
                          setForm({ ...form, date_of_birth: String(unixTimestamp) })
                        } else {
                          setForm({ ...form, date_of_birth: "" })
                        }
                      }}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                      locale={id}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Alamat</Label>
                <Textarea
                  id="address"
                  placeholder="Alamat lengkap pelanggan (opsional)"
                  rows={3}
                  value={form.address}
                  onChange={(e) => {
                    setForm({ ...form, address: e.target.value })
                    setErrors({ ...errors, address: undefined })
                  }}
                  className={cn(errors.address && "border-destructive")}
                />
                {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
              </div>

              <div className="space-y-2">
                <Label>Cabang Terdaftar</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Memuat cabang...</p>
                  ) : (
                    projects.map((project) => (
                      <div key={project.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`project-${project.id}`}
                          checked={form.project_ids.includes(project.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm({
                                ...form,
                                project_ids: [...form.project_ids, project.id],
                              })
                            } else {
                              setForm({
                                ...form,
                                project_ids: form.project_ids.filter((id) => id !== project.id),
                              })
                            }
                          }}
                        />
                        <Label
                          htmlFor={`project-${project.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {project.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                {form.project_ids.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {form.project_ids.length} cabang dipilih
                  </p>
                )}
              </div>
            </div>

            {/* Keanggotaan Member */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Keanggotaan Member
              </h3>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_member"
                  checked={form.is_member}
                  onCheckedChange={(checked) => {
                    const isMember = checked === true
                    setForm({
                      ...form,
                      is_member: isMember,
                      member_code: isMember && !form.member_code ? `MBR${Date.now()}` : form.member_code,
                      member_since: isMember && !form.member_since ? new Date().toISOString().split('T')[0] : form.member_since,
                    })
                  }}
                />
                <Label htmlFor="is_member" className="text-sm font-medium cursor-pointer">
                  Jadikan Member
                </Label>
              </div>

              {form.is_member && (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-1.5">
                    <Label htmlFor="member_code">Kode Member</Label>
                    <Input
                      id="member_code"
                      placeholder="MBR123456"
                      value={form.member_code}
                      onChange={(e) => setForm({ ...form, member_code: e.target.value })}
                      className={cn(errors.member_code && "border-destructive")}
                    />
                    {errors.member_code && <p className="text-xs text-destructive">{errors.member_code}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="member_since">Member Sejak</Label>
                    <Input
                      id="member_since"
                      type="date"
                      value={form.member_since}
                      onChange={(e) => setForm({ ...form, member_since: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="points">Poin Member</Label>
                    <Input
                      id="points"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.points}
                      onChange={(e) => setForm({ ...form, points: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Informasi Tambahan */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Informasi Tambahan
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="hobby">Hobi</Label>
                  <Input
                    id="hobby"
                    placeholder="Hobi pelanggan"
                    value={form.hobby}
                    onChange={(e) => setForm({ ...form, hobby: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="favorite_food">Makanan Favorit</Label>
                  <Input
                    id="favorite_food"
                    placeholder="Makanan favorit"
                    value={form.favorite_food}
                    onChange={(e) => setForm({ ...form, favorite_food: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="behavior">Perilaku/Catatan</Label>
                <Textarea
                  id="behavior"
                  placeholder="Catatan tentang perilaku pelanggan"
                  rows={2}
                  value={form.behavior}
                  onChange={(e) => setForm({ ...form, behavior: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Lokasi Google Maps</Label>
                <MapPicker
                  value={form.maps}
                  onChange={(mapsUrl, lat, lng) => setForm({ ...form, maps: mapsUrl })}
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
              {editTarget ? "Simpan Perubahan" : "Tambah Pelanggan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pelanggan?</AlertDialogTitle>
            <AlertDialogDescription>
              Pelanggan <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span> akan dihapus.
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
