"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Search, Loader2, ChevronLeft, ChevronRight, UserCheck, Phone, MapPin, CreditCard } from "lucide-react"
import { api } from "@/lib/api"
import { formatDate } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Partnership = {
  id: number
  name: string
  phone: string
  address: string | null
  account_number: string | null
  branch_name: string
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

type FormState = {
  name: string
  phone: string
  address: string
  account_number: string
}

type ErrorState = Partial<Record<keyof FormState, string>>

const emptyForm: FormState = { name: "", phone: "", address: "", account_number: "" }

const STORAGE_KEY_SEARCH = "partnership_list_search"
const STORAGE_KEY_PAGE = "partnership_list_page"

export function PartnershipClient() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
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

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Partnership | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<ErrorState>({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Partnership | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchPartnerships(page = 1) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(15) })
      if (search.trim()) params.append("search", search.trim())

      const res = await api.get<{
        data: Partnership[]
        pagination: { current_page: number; per_page: number; total: number; total_pages: number }
      }>(`/api/partnerships?${params.toString()}`)

      const p = res.pagination
      const perPage = p?.per_page ?? 15
      const currentPage = p?.current_page ?? 1
      const total = p?.total ?? 0
      const rows = res.data ?? []

      setPartnerships(rows)
      setPagination({
        current_page: currentPage,
        last_page: p?.total_pages ?? 1,
        per_page: perPage,
        total,
        from: total === 0 ? 0 : (currentPage - 1) * perPage + 1,
        to: total === 0 ? 0 : (currentPage - 1) * perPage + rows.length,
      })

      sessionStorage.setItem(STORAGE_KEY_PAGE, String(currentPage))
    } catch {
      setPartnerships([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const savedSearch = sessionStorage.getItem(STORAGE_KEY_SEARCH) || ""
    const savedPage = parseInt(sessionStorage.getItem(STORAGE_KEY_PAGE) || "1", 10)
    setSearch(savedSearch)
    setInitialized(true)
    fetchPartnerships(savedPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!initialized) return
    sessionStorage.setItem(STORAGE_KEY_SEARCH, search)
    const timer = setTimeout(() => fetchPartnerships(1), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(partnership: Partnership) {
    setEditTarget(partnership)
    setForm({
      name: partnership.name ?? "",
      phone: partnership.phone ?? "",
      address: partnership.address ?? "",
      account_number: partnership.account_number ?? "",
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
        account_number: form.account_number.trim() || null,
      }

      if (editTarget) {
        await api.put(`/api/partnerships/${editTarget.id}`, payload)
      } else {
        await api.post("/api/partnerships", payload)
      }

      setDialogOpen(false)
      fetchPartnerships(pagination.current_page)
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
      await api.delete(`/api/partnerships/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchPartnerships(pagination.current_page)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mitra Kerja</h1>
          <p className="text-sm text-muted-foreground">Kelola data mitra kerja dan vendor.</p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah Mitra Kerja
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama / telepon / alamat..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="ml-auto">
            {pagination.total} mitra
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 hidden md:table-cell">#</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead className="hidden sm:table-cell">Kontak</TableHead>
              <TableHead className="hidden lg:table-cell">Alamat</TableHead>
              <TableHead className="hidden xl:table-cell">Rekening</TableHead>
              <TableHead className="hidden md:table-cell">Cabang</TableHead>
              <TableHead className="hidden lg:table-cell">Ditambahkan</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : partnerships.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <UserCheck className="h-10 w-10 text-muted-foreground/50" />
                    <p>Belum ada data mitra kerja.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              partnerships.map((partnership, idx) => (
                <TableRow key={partnership.id}>
                  <TableCell className="text-center text-sm text-muted-foreground hidden md:table-cell">
                    {pagination.from + idx}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <UserCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{partnership.name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {partnership.phone}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {partnership.phone}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {partnership.address ? (
                      <div className="flex items-start gap-1 text-sm max-w-[220px]">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{partnership.address}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {partnership.account_number ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        {partnership.account_number}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{partnership.branch_name}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDate(partnership.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(partnership)}
                        title="Edit Mitra Kerja"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(partnership)}
                        title="Hapus Mitra Kerja"
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

        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Menampilkan {pagination.from} - {pagination.to} dari {pagination.total} mitra
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPartnerships(pagination.current_page - 1)}
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
                onClick={() => fetchPartnerships(pagination.current_page + 1)}
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

      {/* Add / Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Mitra Kerja" : "Tambah Mitra Kerja"}</DialogTitle>
            <DialogDescription>
              {editTarget ? "Perbarui informasi mitra kerja." : "Tambahkan mitra kerja baru."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Nama Mitra Kerja <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value })
                  setErrors({ ...errors, name: undefined })
                }}
                placeholder="PT Mitra Sejahtera"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Nomor Telepon <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => {
                  const filtered = e.target.value.replace(/[^0-9+]/g, "")
                  setForm({ ...form, phone: filtered })
                  setErrors({ ...errors, phone: undefined })
                }}
                placeholder="081234567890"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Alamat lengkap mitra kerja"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account_number">Nomor Rekening</Label>
              <Input
                id="account_number"
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                placeholder="1234567890 (BCA)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
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
            <AlertDialogTitle>Hapus Mitra Kerja?</AlertDialogTitle>
            <AlertDialogDescription>
              Mitra kerja <span className="font-semibold text-foreground">&quot;{deleteTarget?.name}&quot;</span> akan dihapus.
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
