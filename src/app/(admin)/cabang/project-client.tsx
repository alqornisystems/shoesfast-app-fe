"use client"

import { useEffect, useState, useRef } from "react"
import { Plus, Pencil, Trash2, Search, Loader2, Camera } from "lucide-react"
import { api } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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

type Project = {
  id: number
  name: string
  phone: string | null
  email: string | null
  logo: string | null
  full_address: string | null
  latitude: number | null
  longitude: number | null
  whatsapp: string | null
  maps: string | null
  instagram: string | null
  facebook: string | null
  tiktok: string | null
  website: string | null
  created_at: number | null
  modified_at: number | null
}

type FormState = {
  name: string
  phone: string
  email: string
  logo: string
  full_address: string
  latitude: string
  longitude: string
  whatsapp: string
  maps: string
  instagram: string
  facebook: string
  tiktok: string
  website: string
}

type ErrorState = Partial<Record<keyof FormState, string>>

const emptyForm: FormState = {
  name: "",
  phone: "",
  email: "",
  logo: "",
  full_address: "",
  latitude: "",
  longitude: "",
  whatsapp: "",
  maps: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  website: "",
}

export function ProjectClient() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Project | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<ErrorState>({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function fetchProjects() {
    setLoading(true)
    try {
      const json = await api.get<{ data: Project[] }>("/api/projects")
      setProjects(json.data ?? [])
    } catch {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(project: Project) {
    setEditTarget(project)
    setForm({
      name: project.name,
      phone: project.phone || "",
      email: project.email || "",
      logo: project.logo || "",
      full_address: project.full_address || "",
      latitude: project.latitude ? String(project.latitude) : "",
      longitude: project.longitude ? String(project.longitude) : "",
      whatsapp: project.whatsapp || "",
      maps: project.maps || "",
      instagram: project.instagram || "",
      facebook: project.facebook || "",
      tiktok: project.tiktok || "",
      website: project.website || "",
    })
    setErrors({})
    setDialogOpen(true)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setForm({ ...form, logo: base64 })
      setErrors({ ...errors, logo: undefined })
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    const errs: ErrorState = {}
    if (!form.name.trim()) errs.name = "Nama cabang wajib diisi."

    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setSaving(true)
    setErrors({})
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        logo: form.logo || null,
        full_address: form.full_address.trim() || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        whatsapp: form.whatsapp.trim() || null,
        maps: form.maps.trim() || null,
        instagram: form.instagram.trim() || null,
        facebook: form.facebook.trim() || null,
        tiktok: form.tiktok.trim() || null,
        website: form.website.trim() || null,
      }

      if (editTarget) {
        await api.put(`/api/projects/${editTarget.id}`, payload)
      } else {
        await api.post("/api/projects", payload)
      }

      setDialogOpen(false)
      fetchProjects()
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
      await api.delete(`/api/projects/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchProjects()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cabang</h1>
          <p className="text-sm text-muted-foreground">
            Kelola daftar cabang / lokasi bisnis.
          </p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Cabang
        </Button>
      </div>

      {/* Table card */}
      <div className="rounded-xl border bg-card shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari cabang..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="ml-auto">
            {filtered.length} cabang
          </Badge>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Nama Cabang</TableHead>
              <TableHead className="hidden md:table-cell">Alamat</TableHead>
              <TableHead className="hidden lg:table-cell">Telepon</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  {search ? "Tidak ada cabang yang cocok." : "Belum ada data cabang."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((project, idx) => (
                <TableRow key={project.id}>
                  <TableCell className="text-center text-muted-foreground text-sm">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {project.full_address || "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {project.phone || "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {project.email || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(project)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(project)}
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
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Cabang" : "Tambah Cabang"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Logo Upload */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 overflow-hidden bg-muted/50 flex items-center justify-center">
                  {form.logo ? (
                    <img
                      src={form.logo}
                      alt="Logo preview"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Logo Cabang (opsional)
                </p>
                {form.logo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => setForm({ ...form, logo: "" })}
                  >
                    Hapus logo
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">
                Nama Cabang <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="cth. Cabang Jakarta Pusat"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value })
                  setErrors({ ...errors, name: undefined })
                }}
                className={cn(errors.name && "border-destructive")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="full_address">Alamat Lengkap</Label>
              <Textarea
                id="full_address"
                placeholder="Alamat lengkap cabang"
                value={form.full_address}
                onChange={(e) => {
                  setForm({ ...form, full_address: e.target.value })
                  setErrors({ ...errors, full_address: undefined })
                }}
                className={cn(errors.full_address && "border-destructive")}
                rows={3}
              />
              {errors.full_address && (
                <p className="text-xs text-destructive">{errors.full_address}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telepon</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="08xx-xxxx-xxxx"
                  value={form.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "")
                    setForm({ ...form, phone: val })
                    setErrors({ ...errors, phone: undefined })
                  }}
                  className={cn(errors.phone && "border-destructive")}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="08xx-xxxx-xxxx"
                  value={form.whatsapp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "")
                    setForm({ ...form, whatsapp: val })
                    setErrors({ ...errors, whatsapp: undefined })
                  }}
                  className={cn(errors.whatsapp && "border-destructive")}
                />
                {errors.whatsapp && (
                  <p className="text-xs text-destructive">{errors.whatsapp}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="cabang@example.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value })
                    setErrors({ ...errors, email: undefined })
                  }}
                  className={cn(errors.email && "border-destructive")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={form.website}
                  onChange={(e) => {
                    setForm({ ...form, website: e.target.value })
                    setErrors({ ...errors, website: undefined })
                  }}
                  className={cn(errors.website && "border-destructive")}
                />
                {errors.website && (
                  <p className="text-xs text-destructive">{errors.website}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Lokasi Google Maps</Label>
              <MapPicker
                value={form.maps}
                onChange={(mapsUrl, lat, lng) => {
                  setForm({
                    ...form,
                    maps: mapsUrl,
                    latitude: lat ? String(lat) : "",
                    longitude: lng ? String(lng) : ""
                  })
                  setErrors({ ...errors, maps: undefined })
                }}
              />
              {errors.maps && (
                <p className="text-xs text-destructive">{errors.maps}</p>
              )}
              {form.latitude && form.longitude && (
                <p className="text-xs text-muted-foreground">
                  Koordinat: {parseFloat(form.latitude).toFixed(7)}, {parseFloat(form.longitude).toFixed(7)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  type="text"
                  placeholder="@username"
                  value={form.instagram}
                  onChange={(e) => {
                    setForm({ ...form, instagram: e.target.value })
                    setErrors({ ...errors, instagram: undefined })
                  }}
                  className={cn(errors.instagram && "border-destructive")}
                />
                {errors.instagram && (
                  <p className="text-xs text-destructive">{errors.instagram}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  type="text"
                  placeholder="username atau URL"
                  value={form.facebook}
                  onChange={(e) => {
                    setForm({ ...form, facebook: e.target.value })
                    setErrors({ ...errors, facebook: undefined })
                  }}
                  className={cn(errors.facebook && "border-destructive")}
                />
                {errors.facebook && (
                  <p className="text-xs text-destructive">{errors.facebook}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tiktok">TikTok</Label>
                <Input
                  id="tiktok"
                  type="text"
                  placeholder="@username"
                  value={form.tiktok}
                  onChange={(e) => {
                    setForm({ ...form, tiktok: e.target.value })
                    setErrors({ ...errors, tiktok: undefined })
                  }}
                  className={cn(errors.tiktok && "border-destructive")}
                />
                {errors.tiktok && (
                  <p className="text-xs text-destructive">{errors.tiktok}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>
                Batal
              </Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTarget ? "Simpan Perubahan" : "Tambah Cabang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Cabang?</AlertDialogTitle>
            <AlertDialogDescription>
              Cabang{" "}
              <span className="font-semibold text-foreground">
                "{deleteTarget?.name}"
              </span>{" "}
              akan dihapus. Tindakan ini tidak dapat dibatalkan.
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
