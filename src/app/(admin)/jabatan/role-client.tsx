"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { SimplePagination } from "@/components/list-pagination"
import { SortPicker, type SortOption } from "@/components/treatment-filters"
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
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, titleCase } from "@/lib/utils"

type Role = {
  id: number
  name: string
}

const STORAGE_KEY_SEARCH = "role_list_search"
const STORAGE_KEY_PAGE = "role_list_page"

type FormState = { name: string }
type ErrorState = { name?: string }

type PaginationData = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

const SORT_OPTIONS: SortOption[] = [
  { value: "name", label: "Nama jabatan" },
  { value: "created_at", label: "Waktu dibuat" },
]

export function RoleClient() {
  const [roles, setRoles] = useState<Role[]>([])
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
  const [sort, setSort] = useState("default")
  const [order, setOrder] = useState<"asc" | "desc">("asc")
  const [initialized, setInitialized] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Role | null>(null)
  const [form, setForm] = useState<FormState>({ name: "" })
  const [errors, setErrors] = useState<ErrorState>({})
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch
  async function fetchRoles(page = 1) {
    setLoading(true)
    try {
      const json = await api.get<any>(`/api/roles?page=${page}&per_page=25${sort !== "default" ? `&sort=${sort}&order=${order}` : ""}`)
      setRoles(json.data ?? [])
      setPagination({
        current_page: json.current_page ?? 1,
        last_page: json.last_page ?? 1,
        per_page: json.per_page ?? 25,
        total: json.total ?? 0,
        from: json.from ?? 0,
        to: json.to ?? 0,
      })
      sessionStorage.setItem(STORAGE_KEY_PAGE, String(json.current_page ?? 1))
    } catch {
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  // Restore persisted list position on mount (exactly one initial fetch)
  useEffect(() => {
    const savedSearch = sessionStorage.getItem(STORAGE_KEY_SEARCH) || ""
    const savedPage = parseInt(sessionStorage.getItem(STORAGE_KEY_PAGE) || "1", 10)
    setSearch(savedSearch)
    setInitialized(true)
    fetchRoles(savedPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist search text (client-side only — no server fetch on this page)
  useEffect(() => {
    if (!initialized) return
    sessionStorage.setItem(STORAGE_KEY_SEARCH, search)
  }, [search, initialized])

  useEffect(() => {
    if (!initialized) return
    fetchRoles(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, order])

  // Open add dialog
  function openAdd() {
    setEditTarget(null)
    setForm({ name: "" })
    setErrors({})
    setDialogOpen(true)
  }

  // Open edit dialog
  function openEdit(role: Role) {
    setEditTarget(role)
    setForm({ name: role.name })
    setErrors({})
    setDialogOpen(true)
  }

  // Save (add or edit)
  async function handleSave() {
    if (!form.name.trim()) {
      setErrors({ name: "Nama jabatan wajib diisi." })
      return
    }
    setSaving(true)
    setErrors({})
    try {
      if (editTarget) {
        await api.put(`/api/roles/${editTarget.id}`, { name: form.name.trim() })
      } else {
        await api.post("/api/roles", { name: form.name.trim() })
      }
      setDialogOpen(false)
      fetchRoles(pagination.current_page)
    } catch (err: unknown) {
      const galat = err as { errors?: Record<string, string[]>; message?: string }

      // Galat yang BUKAN validasi — 403, 500, jaringan mati — sebelumnya jatuh ke
      // sini tanpa jejak: dialognya tetap terbuka, tombolnya berhenti berputar, dan
      // tidak ada satu pun pesan. Bagi yang memakainya, tombol Simpan sekadar tidak
      // berfungsi. Apa pun yang gagal harus mengatakan dirinya gagal.
      if (!galat?.errors) {
        toast.error(galat?.message || "Gagal menyimpan. Silakan coba lagi.")
        return
      }

      const e = err as { errors?: { name?: string[] } }
      if (e?.errors?.name) {
        setErrors({ name: e.errors.name[0] })
      }
    } finally {
      setSaving(false)
    }
  }

  // Delete
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/roles/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchRoles(pagination.current_page)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jabatan</h1>
          <p className="line-clamp-1 text-sm text-muted-foreground">
            Kelola jabatan / role akses karyawan.
          </p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Jabatan
        </Button>
      </div>

      {/* Table card */}
      <div className="rounded-xl border bg-card shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-3 sm:gap-3 sm:px-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari jabatan..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <SortPicker
            sort={sort}
            order={order}
            onChange={(kolom, arah) => { setSort(kolom); setOrder(arah) }}
            options={SORT_OPTIONS}
          />
          <Badge variant="secondary" className="ml-auto">
            {pagination.total} jabatan
          </Badge>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Nama Jabatan</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                  Belum ada data jabatan.
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role, idx) => (
                <TableRow key={role.id}>
                  <TableCell className="text-center text-muted-foreground text-sm">
                    {pagination.from + idx}
                  </TableCell>
                  <TableCell className="font-medium">{titleCase(role.name)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2 sm:gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(role)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(role)}
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
              Menampilkan {pagination.from} - {pagination.to} dari {pagination.total} jabatan
            </div>
            <SimplePagination
              currentPage={pagination.current_page}
              totalPages={pagination.last_page}
              onPageChange={(halaman) => fetchRoles(halaman)}
            />
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Jabatan" : "Tambah Jabatan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama Jabatan</Label>
              <Input
                id="name"
                placeholder="cth. Admin, Teknisi, Kurir..."
                value={form.name}
                onChange={(e) => {
                  setForm({ name: e.target.value })
                  setErrors({})
                }}
                className={cn(errors.name && "border-destructive focus-visible:ring-destructive")}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm" disabled={saving}>Batal</Button>
            </DialogClose>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editTarget ? "Simpan Perubahan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jabatan?</AlertDialogTitle>
            <AlertDialogDescription>
              Jabatan <span className="font-semibold text-foreground">"{titleCase(deleteTarget?.name)}"</span> akan dihapus.
              Tindakan ini tidak dapat dibatalkan.
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
