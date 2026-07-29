"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Gift, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Reward = {
  id: number
  name: string
  type: number
  type_label: string
  services_id: number | null
  service_name: string | null
  points_cost: number
  photo: string | null
  is_active: number
}

type Service = { id: number; name: string }

type PaginationData = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

const STORAGE_KEY_SEARCH = "hadiah_list_search"
const STORAGE_KEY_PAGE = "hadiah_list_page"

const emptyForm = {
  name: "",
  type: 0,
  services_id: null as number | null,
  points_cost: "",
  is_active: true,
}

export function RewardClient() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [pagination, setPagination] = useState<PaginationData>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
    from: 0,
    to: 0,
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Reward | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Reward | null>(null)
  const [deleting, setDeleting] = useState(false)

  const initialized = useRef(false)

  const fetchRewards = useCallback(async (page: number, keyword: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: "25",
        ...(keyword ? { search: keyword } : {}),
      })
      const res = await api.get<{ data: Reward[] } & PaginationData>(
        `/api/rewards?${params}`
      )
      setRewards(res.data)
      setPagination({
        current_page: res.current_page,
        last_page: res.last_page,
        per_page: res.per_page,
        total: res.total,
        from: res.from ?? 0,
        to: res.to ?? 0,
      })
      sessionStorage.setItem(STORAGE_KEY_PAGE, String(res.current_page))
    } catch {
      toast.error("Gagal memuat katalog hadiah")
      setRewards([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Pulihkan posisi terakhir supaya kembali dari halaman lain tidak
  // melemparkan admin ke halaman satu.
  useEffect(() => {
    const savedSearch = sessionStorage.getItem(STORAGE_KEY_SEARCH) ?? ""
    const savedPage = Number(sessionStorage.getItem(STORAGE_KEY_PAGE) ?? "1")
    setSearch(savedSearch)
    fetchRewards(savedPage, savedSearch).finally(() => {
      initialized.current = true
    })
    api
      .get<{ data: Service[] }>("/api/services?per_page=500")
      .then((r) => setServices(r.data))
      .catch(() => setServices([]))
  }, [fetchRewards])

  // Pencarian ditunda 300 ms dan selalu balik ke halaman 1.
  useEffect(() => {
    if (!initialized.current) return
    const t = setTimeout(() => {
      sessionStorage.setItem(STORAGE_KEY_SEARCH, search)
      fetchRewards(1, search)
    }, 300)
    return () => clearTimeout(t)
  }, [search, fetchRewards])

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(r: Reward) {
    setEditTarget(r)
    setForm({
      name: r.name ?? "",
      type: r.type ?? 0,
      services_id: r.services_id ?? null,
      points_cost: String(r.points_cost ?? ""),
      is_active: r.is_active === 1,
    })
    setErrors({})
    setDialogOpen(true)
  }

  async function handleSave() {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = "Nama hadiah wajib diisi"
    if (!form.points_cost || Number(form.points_cost) < 1)
      next.points_cost = "Poin minimal 1"
    if (form.type === 0 && !form.services_id)
      next.services_id = "Pilih layanan yang digratiskan"

    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        services_id: form.type === 0 ? form.services_id : null,
        points_cost: Number(form.points_cost),
        is_active: form.is_active,
      }

      if (editTarget) await api.put(`/api/rewards/${editTarget.id}`, payload)
      else await api.post("/api/rewards", payload)

      toast.success(editTarget ? "Hadiah diperbarui" : "Hadiah ditambahkan")
      setDialogOpen(false)
      fetchRewards(pagination.current_page, search)
    } catch (e) {
      const err = e as { errors?: Record<string, string[]> }
      if (err.errors) {
        const map: Record<string, string> = {}
        for (const k of Object.keys(err.errors)) map[k] = err.errors[k][0]
        setErrors(map)
      } else {
        toast.error("Gagal menyimpan hadiah")
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/rewards/${deleteTarget.id}`)
      toast.success("Hadiah dihapus")
      setDeleteTarget(null)
      fetchRewards(pagination.current_page, search)
    } catch {
      toast.error("Gagal menghapus hadiah")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Katalog Hadiah</h1>
          <p className="text-muted-foreground">
            Hadiah yang bisa ditukar pelanggan dengan poin di portal.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Hadiah
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b p-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-8"
              placeholder="Cari nama hadiah..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary" className="ml-auto">
            {pagination.total} hadiah
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead className="hidden sm:table-cell">Jenis</TableHead>
              <TableHead className="hidden md:table-cell">Layanan</TableHead>
              <TableHead>Poin</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [0, 1, 2, 3, 4].map((i) => (
                <TableRow key={i}>
                  {[0, 1, 2, 3, 4, 5, 6].map((c) => (
                    <TableCell key={c}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rewards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <Gift className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Belum ada hadiah. Tambahkan supaya pelanggan punya alasan
                    mengumpulkan poin.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              rewards.map((r, idx) => (
                <TableRow key={r.id}>
                  <TableCell>{pagination.from + idx}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {r.type_label}
                  </TableCell>
                  {/* Null-safe: layanan bisa dihapus setelah hadiah dibuat. */}
                  <TableCell className="hidden md:table-cell">
                    {r.service_name ?? "-"}
                  </TableCell>
                  <TableCell>{r.points_cost}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={r.is_active === 1 ? "outline" : "secondary"}>
                      {r.is_active === 1 ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Ubah"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Hapus"
                      onClick={() => setDeleteTarget(r)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {pagination.last_page > 1 && (
          <div className="flex items-center justify-between border-t p-3">
            <span className="text-sm text-muted-foreground">
              Menampilkan {pagination.from} - {pagination.to} dari{" "}
              {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current_page <= 1}
                onClick={() =>
                  fetchRewards(pagination.current_page - 1, search)
                }
              >
                Sebelumnya
              </Button>
              <span className="text-sm">
                {pagination.current_page} / {pagination.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() =>
                  fetchRewards(pagination.current_page + 1, search)
                }
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Ubah Hadiah" : "Tambah Hadiah"}
            </DialogTitle>
            <DialogDescription>
              Pelanggan rata-rata mengumpulkan 15–20 poin setahun. Hadiah di
              atas 50 poin butuh lebih dari dua tahun bagi pelanggan biasa.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nama hadiah</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Cuci Sepatu Gratis"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Jenis</Label>
              <Select
                value={String(form.type)}
                onValueChange={(v) =>
                  setForm({ ...form, type: Number(v), services_id: null })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Layanan gratis</SelectItem>
                  <SelectItem value="1">Hadiah barang</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type === 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Layanan yang digratiskan</Label>
                <Select
                  value={form.services_id ? String(form.services_id) : ""}
                  onValueChange={(v) =>
                    setForm({ ...form, services_id: Number(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih layanan" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.services_id && (
                  <p className="text-sm text-destructive">
                    {errors.services_id}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Poin yang dibutuhkan</Label>
              <Input
                type="number"
                min={1}
                value={form.points_cost}
                onChange={(e) =>
                  setForm({ ...form, points_cost: e.target.value })
                }
              />
              {errors.points_cost && (
                <p className="text-sm text-destructive">{errors.points_cost}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="reward-active"
                checked={form.is_active}
                onCheckedChange={(v) =>
                  setForm({ ...form, is_active: v === true })
                }
              />
              <Label htmlFor="reward-active" className="cursor-pointer">
                Tampilkan di portal
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Hadiah tidak lagi muncul di portal. Penukaran yang sudah terjadi
              tetap tersimpan beserta nama hadiahnya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
