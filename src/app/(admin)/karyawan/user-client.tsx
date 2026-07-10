"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Search, Loader2, Eye, EyeOff, Upload, X, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

// Normalize phone number: remove leading 0 or 62
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '') // Remove non-digits
  if (normalized.startsWith('62')) {
    normalized = normalized.substring(2) // Remove 62
  } else if (normalized.startsWith('0')) {
    normalized = normalized.substring(1) // Remove 0
  }
  return normalized
}

type User = {
  id: number
  name: string
  email: string
  phone: string | null
  photo: string | null
  roles_id: number
  role_name: string | null
  projects_id: number | null
  project_name: string | null
  payment_date: number | null
  account_number: number | null
  created_at: number | null
}

type Role = { id: number; name: string }
type Project = { id: number; name: string }

type FormState = {
  name: string
  email: string
  phone: string
  password: string
  photo: string
  roles_id: string
  projects_id: string
}

type ErrorState = Partial<Record<keyof FormState, string>>

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  photo: "",
  roles_id: "",
  projects_id: "",
}

type PaginationData = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

const STORAGE_KEY_SEARCH = 'user_list_search'
const STORAGE_KEY_PAGE = 'user_list_page'

export function UserClient() {
  const router = useRouter()
  const { branch } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
    from: 0,
    to: 0,
  })
  const [roles, setRoles] = useState<Role[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [initialized, setInitialized] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<ErrorState>({})
  const [saving, setSaving] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchUsers(page = 1) {
    setLoading(true)
    try {
      const [usersRes, rolesRes, projectsRes] = await Promise.all([
        api.get<any>(`/api/users?page=${page}&per_page=25`),
        api.get<any>("/api/roles?per_page=1000"),
        api.get<any>("/api/projects?per_page=1000"),
      ])
      setUsers(usersRes.data ?? [])
      setPagination({
        current_page: usersRes.current_page ?? 1,
        last_page: usersRes.last_page ?? 1,
        per_page: usersRes.per_page ?? 25,
        total: usersRes.total ?? 0,
        from: usersRes.from ?? 0,
        to: usersRes.to ?? 0,
      })
      setRoles(rolesRes.data ?? [])
      setProjects(projectsRes.data ?? [])

      // Save current page to sessionStorage
      sessionStorage.setItem(STORAGE_KEY_PAGE, String(usersRes.current_page ?? 1))
    } catch {
      setUsers([])
      setRoles([])
      setProjects([])
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
    fetchUsers(savedPage)
  }, [])

  // Persist search to sessionStorage (search is client-side; no server refetch)
  useEffect(() => {
    if (!initialized) return
    sessionStorage.setItem(STORAGE_KEY_SEARCH, search)
  }, [search])

  function openAdd() {
    setEditTarget(null)
    // Auto-select active branch if not "Semua Cabang"
    const initialForm = { ...emptyForm }
    if (branch && branch.active_id !== null) {
      initialForm.projects_id = String(branch.active_id)
    }
    setForm(initialForm)
    setErrors({})
    setShowPass(false)
    setDialogOpen(true)
  }

  function openEdit(user: User) {
    setEditTarget(user)
    // If active branch is set, lock to that branch; otherwise use user's current branch
    const projects_id = branch && branch.active_id !== null
      ? String(branch.active_id)
      : (user.projects_id ? String(user.projects_id) : "")

    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      password: "",
      photo: user.photo ?? "",
      roles_id: String(user.roles_id),
      projects_id,
    })
    setErrors({})
    setShowPass(false)
    setDialogOpen(true)
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErrors({ ...errors, photo: "Ukuran file maksimal 2MB." })
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setForm({ ...form, photo: reader.result as string })
      setErrors({ ...errors, photo: undefined })
    }
    reader.readAsDataURL(file)
  }

  function removePhoto() {
    setForm({ ...form, photo: "" })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function generatePin() {
    const pin = Math.floor(100000 + Math.random() * 900000).toString()
    setForm({ ...form, password: pin })
    setErrors({ ...errors, password: undefined })
  }

  async function handleSave() {
    const errs: ErrorState = {}
    if (!form.name.trim()) errs.name = "Nama wajib diisi."
    if (!form.email.trim()) errs.email = "Email wajib diisi."
    if (!editTarget && !form.password) errs.password = "PIN wajib diisi."
    if (!form.roles_id) errs.roles_id = "Jabatan wajib dipilih."

    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setSaving(true)
    setErrors({})
    try {
      // Normalize phone number before saving
      const normalizedPhone = form.phone.trim() ? normalizePhone(form.phone.trim()) : ''

      const payload: Record<string, string | number | null> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: normalizedPhone,
        roles_id: Number(form.roles_id),
        projects_id: form.projects_id ? Number(form.projects_id) : null,
      }
      if (form.password) payload.password = form.password
      if (form.photo) payload.photo = form.photo

      if (editTarget) {
        await api.put(`/api/users/${editTarget.id}`, payload)
      } else {
        await api.post("/api/users", payload)
      }

      setDialogOpen(false)
      fetchUsers(pagination.current_page)
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
      await api.delete(`/api/users/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchUsers(pagination.current_page)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Karyawan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data karyawan dan pengguna sistem.
          </p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Karyawan
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama / email..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="ml-auto">
            {pagination.total} karyawan
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 hidden md:table-cell">#</TableHead>
              <TableHead>Karyawan</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Telepon</TableHead>
              <TableHead className="hidden xl:table-cell">Jabatan</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Belum ada data karyawan.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, idx) => (
                <TableRow key={user.id}>
                  <TableCell className="text-center text-sm text-muted-foreground hidden md:table-cell">{pagination.from + idx}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photo || undefined} />
                        <AvatarFallback className="text-xs font-semibold">
                          {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground lg:hidden truncate">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden lg:table-cell truncate">{user.email}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {user.phone || "-"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <Badge variant="outline" className="text-xs">
                      {user.role_name || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(user)}
                        title="Edit Karyawan"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(user)}
                        title="Hapus Karyawan"
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
              Menampilkan {pagination.from} - {pagination.to} dari {pagination.total} karyawan
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchUsers(pagination.current_page - 1)}
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
                onClick={() => fetchUsers(pagination.current_page + 1)}
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editTarget ? "Edit Karyawan" : "Tambah Karyawan Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Photo Upload Section */}
            <div className="flex flex-col items-center gap-4 pb-6 border-b">
              <Avatar className="h-24 w-24 border-2">
                {form.photo ? (
                  <AvatarImage src={form.photo} alt={form.name} />
                ) : null}
                <AvatarFallback className="text-2xl font-bold">
                  {form.name ? form.name.slice(0, 2).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
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
                  {form.photo ? "Ganti Foto" : "Upload Foto"}
                </Button>
                {form.photo && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={removePhoto}
                    className="gap-1.5 text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                    Hapus
                  </Button>
                )}
              </div>
              {errors.photo && <p className="text-xs text-destructive">{errors.photo}</p>}
              <p className="text-xs text-muted-foreground text-center">
                Format: JPG, PNG. Maksimal 2MB.
              </p>
            </div>

            {/* Informasi Pribadi */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Informasi Pribadi</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nama Lengkap <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value })
                      setErrors({ ...errors, name: undefined })
                    }}
                    className={cn(errors.name && "border-destructive")}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value })
                      setErrors({ ...errors, email: undefined })
                    }}
                    className={cn(errors.email && "border-destructive")}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telepon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08123456789"
                    value={form.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setForm({ ...form, phone: value })
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="roles_id">Jabatan <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.roles_id}
                    onValueChange={(v) => {
                      setForm({ ...form, roles_id: v })
                      setErrors({ ...errors, roles_id: undefined })
                    }}
                  >
                    <SelectTrigger className={cn(errors.roles_id && "border-destructive")}>
                      <SelectValue placeholder="Pilih jabatan" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.roles_id && <p className="text-xs text-destructive">{errors.roles_id}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="projects_id">Penempatan Cabang</Label>
                  <Select
                    value={form.projects_id || "none"}
                    onValueChange={(v) => {
                      setForm({ ...form, projects_id: v === "none" ? "" : v })
                      setErrors({ ...errors, projects_id: undefined })
                    }}
                    disabled={branch?.active_id !== null}
                  >
                    <SelectTrigger className={cn(errors.projects_id && "border-destructive")}>
                      <SelectValue placeholder="Pilih cabang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tidak ada</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.projects_id && <p className="text-xs text-destructive">{errors.projects_id}</p>}
                  {branch && branch.active_id !== null && (
                    <p className="text-xs text-muted-foreground">
                      Penempatan dikunci ke cabang aktif ({branch.active_name})
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Keamanan Akun */}
            <div className="space-y-4 pt-2 border-t">
              <h3 className="text-sm font-semibold text-foreground">Keamanan Akun</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">
                    PIN {editTarget ? "(kosongkan jika tidak diubah)" : <span className="text-destructive">*</span>}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="password"
                        type={showPass ? "text" : "password"}
                        placeholder={editTarget ? "••••••" : "6 digit PIN"}
                        value={form.password}
                        onChange={(e) => {
                          setForm({ ...form, password: e.target.value })
                          setErrors({ ...errors, password: undefined })
                        }}
                        className={cn("pr-10", errors.password && "border-destructive")}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={generatePin}
                      className="gap-1.5 shrink-0"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Generate PIN
                    </Button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  <p className="text-xs text-muted-foreground">
                    PIN digunakan untuk login karyawan ke sistem. Klik "Generate PIN" untuk membuat PIN acak 6 digit.
                  </p>
                </div>
              </div>
            </div>

          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>Batal</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTarget ? "Simpan Perubahan" : "Tambah Karyawan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Karyawan?</AlertDialogTitle>
            <AlertDialogDescription>
              Karyawan <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span> akan dihapus.
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
