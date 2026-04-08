"use client"

import { useEffect, useState } from "react"
import { Search, Loader2, ChevronLeft, ChevronRight, Package, CheckCircle2, Clock, AlertCircle, XCircle, Calendar, Pencil, Play, Building2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Treatment = {
  id: number
  orders_id: number
  orders_code: string
  orders_items_id: number
  orders_items_name: string
  orders_items_photo: string | null
  services_id: number
  services_name: string
  services_estimation: number
  customers_name: string
  customers_phone: string
  partnerships_id: number | null
  partnerships_name: string | null
  status: number
  date_start: number
  date_end: number
  progress: number
  price: number
  note: string | null
  done_at: number | null
  created_at: number
}

type Partnership = {
  id: number
  name: string
  address: string
  phone: string
}

type PaginationData = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

export function PartnershipWorkClient() {
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  const [selectedPartnership, setSelectedPartnership] = useState<string>("")
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

  function getImageUrl(photo: string | null): string | null {
    if (!photo) return null
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo
    }
    return `/${photo.startsWith('storage/') ? photo : `storage/${photo}`}`
  }

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [reviewing, setReviewing] = useState(false)
  const [reviewAction, setReviewAction] = useState<"pass" | "fail">("pass")

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null)
  const [editPartnershipId, setEditPartnershipId] = useState("")
  const [editDateEnd, setEditDateEnd] = useState("")
  const [updating, setUpdating] = useState(false)

  async function fetchPartnerships() {
    try {
      const res = await api.get<{ data: Partnership[] }>('/api/partnerships')
      setPartnerships(res.data ?? [])
    } catch {
      setPartnerships([])
    }
  }

  async function fetchTreatments(page = 1) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(15),
        page_type: "pengerjaan-vendor",
      })

      if (search.trim()) {
        params.append('search', search.trim())
      }

      const res = await api.get<any>(`/api/treatments?${params.toString()}`)
      setTreatments(res.data ?? [])
      setPagination({
        current_page: res.current_page ?? 1,
        last_page: res.last_page ?? 1,
        per_page: res.per_page ?? 15,
        total: res.total ?? 0,
        from: res.from ?? 0,
        to: res.to ?? 0,
      })
    } catch {
      setTreatments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPartnerships()
    fetchTreatments()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTreatments(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  function toggleSelection(id: number) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    if (selectedIds.length === treatments.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(treatments.map(t => t.id))
    }
  }

  function openReviewDialog(treatment: Treatment, action: "pass" | "fail") {
    setSelectedTreatment(treatment)
    setReviewAction(action)
    setReviewNote("")
    setReviewDialogOpen(true)
  }

  async function handleMarkComplete(treatmentId: number) {
    try {
      await api.put(`/api/treatments/${treatmentId}/status`, {
        status: 1, // Mark as ready for QC
      })

      toast.success("Treatment Siap QC", {
        description: "Treatment telah selesai dikerjakan dan siap untuk di-QC",
        duration: 4000,
      })

      fetchTreatments(pagination.current_page)
    } catch (error: any) {
      toast.error("Gagal update status", {
        description: error?.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.",
      })
    }
  }

  async function handleBulkForceDone() {
    if (selectedIds.length === 0) {
      toast.warning("Pilih minimal 1 treatment", {
        description: "Centang treatment yang ingin diselesaikan paksa",
        duration: 3000,
      })
      return
    }

    try {
      await api.post('/api/treatments/force-complete', {
        treatment_ids: selectedIds,
      })

      toast.success(`${selectedIds.length} Treatment Diselesaikan Paksa`, {
        description: "Semua treatment langsung diselesaikan tanpa QC",
        duration: 4000,
      })

      setSelectedIds([])
      fetchTreatments(pagination.current_page)
    } catch (error: any) {
      toast.error("Gagal menyelesaikan treatment", {
        description: error?.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.",
      })
    }
  }

  async function handleReview() {
    if (!selectedTreatment) return

    setReviewing(true)
    try {
      if (reviewAction === "pass") {
        await api.put(`/api/treatments/${selectedTreatment.id}/status`, {
          status: 2,
          note: reviewNote || null,
        })

        toast.success("QC Berhasil", {
          description: `Treatment ${selectedTreatment.orders_code} selesai dan lolos QC`,
          duration: 4000,
        })
      } else {
        await api.put(`/api/treatments/${selectedTreatment.id}/status`, {
          status: 0,
          note: reviewNote ? `[QC GAGAL] ${reviewNote}` : "[QC GAGAL] Perlu perbaikan",
        })

        toast.warning("QC Gagal", {
          description: `Treatment ${selectedTreatment.orders_code} dikembalikan untuk perbaikan`,
          duration: 4000,
        })
      }

      setReviewDialogOpen(false)
      setSelectedTreatment(null)
      setReviewNote("")
      fetchTreatments(pagination.current_page)
    } catch (error: any) {
      toast.error("Gagal review treatment", {
        description: error?.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.",
      })
    } finally {
      setReviewing(false)
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  function getDeadlineStatus(date_end: number): 'overdue' | 'warning' | 'normal' {
    const now = Math.floor(Date.now() / 1000)
    const daysUntil = (date_end - now) / (24 * 60 * 60)

    if (daysUntil < 0) return 'overdue'
    if (daysUntil <= 2) return 'warning'
    return 'normal'
  }

  function openEditDialog(treatment: Treatment) {
    setEditingTreatment(treatment)
    setEditPartnershipId(String(treatment.partnerships_id || ''))
    const dateEndFormatted = new Date(treatment.date_end * 1000).toISOString().split('T')[0]
    setEditDateEnd(dateEndFormatted)
    setEditDialogOpen(true)
  }

  async function handleUpdate() {
    if (!editingTreatment) return

    setUpdating(true)
    try {
      const dateEndUnix = Math.floor(new Date(editDateEnd).getTime() / 1000)

      await api.put(`/api/treatments/${editingTreatment.id}/update`, {
        partnerships_id: editPartnershipId ? Number(editPartnershipId) : null,
        date_end: dateEndUnix,
      })

      toast.success("Treatment berhasil diupdate", {
        description: `${editingTreatment.orders_code} telah diperbarui`,
        duration: 4000,
      })

      setEditDialogOpen(false)
      setEditingTreatment(null)
      fetchTreatments(pagination.current_page)
    } catch (error: any) {
      toast.error("Gagal update treatment", {
        description: error?.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.",
      })
    } finally {
      setUpdating(false)
    }
  }

  // Calculate stats
  const now = Math.floor(Date.now() / 1000)
  const stats = {
    inProgress: treatments.filter(t => t.status === 0 || t.status === 1).length,
    readyForQC: treatments.filter(t => t.status === 1).length,
    overdue: treatments.filter(t => t.date_end < now && t.status !== 2).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengerjaan Mitra</h1>
          <p className="text-sm text-muted-foreground">
            Monitor dan review treatment yang sedang dikerjakan mitra
          </p>
        </div>
        {selectedIds.length > 0 && (
          <Button onClick={handleBulkForceDone} variant="destructive" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Done Paksa ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Siap QC</p>
              <p className="text-2xl font-bold">{stats.readyForQC}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Melewati Deadline</p>
              <p className="text-2xl font-bold">{stats.overdue}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Item</p>
              <p className="text-2xl font-bold">{pagination.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari customer / item..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length > 0 && selectedIds.length === treatments.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-12 hidden md:table-cell">#</TableHead>
              <TableHead>Treatment</TableHead>
              <TableHead className="hidden lg:table-cell">Customer</TableHead>
              <TableHead className="hidden xl:table-cell">Mitra</TableHead>
              <TableHead className="hidden lg:table-cell">Mulai</TableHead>
              <TableHead className="hidden md:table-cell">Estimasi Selesai</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-16 w-full" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-8 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : treatments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-10 w-10 text-muted-foreground/50" />
                    <p>Tidak ada item dalam pengerjaan mitra.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              treatments.map((treatment, idx) => {
                const deadlineStatus = getDeadlineStatus(treatment.date_end)

                return (
                  <TableRow
                    key={treatment.id}
                    className={cn(
                      deadlineStatus === 'overdue' && "bg-red-50 hover:bg-red-100",
                      deadlineStatus === 'warning' && "bg-yellow-50 hover:bg-yellow-100",
                      selectedIds.includes(treatment.id) && "bg-blue-50 hover:bg-blue-100"
                    )}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(treatment.id)}
                        onCheckedChange={() => toggleSelection(treatment.id)}
                      />
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground hidden md:table-cell">
                      {pagination.from + idx}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        {getImageUrl(treatment.orders_items_photo) ? (
                          <img
                            src={getImageUrl(treatment.orders_items_photo)!}
                            alt={treatment.orders_items_name}
                            className="h-14 w-14 rounded-lg object-cover border flex-shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted border flex-shrink-0">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="font-bold text-sm">{treatment.orders_items_name}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {treatment.orders_code}
                            </Badge>
                            <Badge
                              variant={treatment.status === 1 ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {treatment.status === 1 ? "Siap QC" : "Dikerjakan"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {treatment.services_name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="max-w-[160px]">
                        <div className="font-medium text-sm truncate">{treatment.customers_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{treatment.customers_phone}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{treatment.partnerships_name || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(treatment.date_start)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className={cn(
                        "text-sm font-medium flex items-center gap-1.5",
                        deadlineStatus === 'overdue' && "text-red-600",
                        deadlineStatus === 'warning' && "text-yellow-600"
                      )}>
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(treatment.date_end)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {treatment.status === 0 ? (
                          <>
                            {/* Status 0: Sedang Dikerjakan */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleMarkComplete(treatment.id)}
                              title="Tandai Selesai (Siap QC)"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(treatment)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {/* Status 1: Siap QC */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => openReviewDialog(treatment, "pass")}
                              title="QC Pass"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => openReviewDialog(treatment, "fail")}
                              title="QC Fail"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(treatment)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Menampilkan {pagination.from} - {pagination.to} dari {pagination.total} item
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchTreatments(pagination.current_page - 1)}
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
                onClick={() => fetchTreatments(pagination.current_page + 1)}
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

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {reviewAction === "pass" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  QC Pass - Selesaikan Treatment
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  QC Gagal - Kembalikan untuk Perbaikan
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "pass"
                ? "Treatment akan ditandai sebagai selesai dan siap untuk delivery"
                : "Treatment akan dikembalikan ke mitra untuk perbaikan"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Treatment Info */}
            {selectedTreatment && (
              <div className={cn(
                "rounded-lg border p-4",
                reviewAction === "pass" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              )}>
                <div className="flex items-start gap-3">
                  {getImageUrl(selectedTreatment.orders_items_photo) ? (
                    <img
                      src={getImageUrl(selectedTreatment.orders_items_photo)!}
                      alt={selectedTreatment.orders_items_name}
                      className="h-12 w-12 rounded-lg object-cover border"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted border">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{selectedTreatment.orders_items_name}</div>
                    <div className="text-xs text-muted-foreground">{selectedTreatment.orders_code}</div>
                    <div className="text-xs text-muted-foreground capitalize mt-1">{selectedTreatment.services_name}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Note Input */}
            <div className="space-y-2">
              <Label htmlFor="note" className="text-sm font-semibold">
                Catatan {reviewAction === "fail" && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="note"
                placeholder={
                  reviewAction === "pass"
                    ? "Tambahkan catatan (opsional)..."
                    : "Jelaskan apa yang perlu diperbaiki..."
                }
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={4}
                className="resize-none"
              />
              {reviewAction === "fail" && (
                <p className="text-xs text-muted-foreground">
                  Catatan ini akan dikirimkan ke mitra untuk perbaikan
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={reviewing}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleReview}
              disabled={reviewing || (reviewAction === "fail" && !reviewNote.trim())}
              className={cn(
                "gap-2",
                reviewAction === "pass"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              )}
            >
              {reviewing && <Loader2 className="h-4 w-4 animate-spin" />}
              {reviewAction === "pass" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Konfirmasi Pass
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Konfirmasi Gagal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Treatment
            </DialogTitle>
            <DialogDescription>
              Ubah mitra atau tanggal estimasi selesai untuk treatment ini
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Treatment Info */}
            {editingTreatment && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  {getImageUrl(editingTreatment.orders_items_photo) ? (
                    <img
                      src={getImageUrl(editingTreatment.orders_items_photo)!}
                      alt={editingTreatment.orders_items_name}
                      className="h-12 w-12 rounded-lg object-cover border"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted border">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{editingTreatment.orders_items_name}</div>
                    <div className="text-xs text-muted-foreground">{editingTreatment.orders_code}</div>
                    <div className="text-xs text-muted-foreground capitalize mt-1">{editingTreatment.services_name}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Partnership Select */}
            <div className="space-y-2">
              <Label htmlFor="partnership" className="text-sm font-semibold">
                Mitra Kerja
              </Label>
              <Select value={editPartnershipId} onValueChange={setEditPartnershipId}>
                <SelectTrigger id="partnership">
                  <SelectValue placeholder="Pilih mitra..." />
                </SelectTrigger>
                <SelectContent>
                  {partnerships.map((partnership) => (
                    <SelectItem key={partnership.id} value={String(partnership.id)}>
                      {partnership.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date End Input */}
            <div className="space-y-2">
              <Label htmlFor="date_end" className="text-sm font-semibold">
                Tanggal Estimasi Selesai
              </Label>
              <Input
                id="date_end"
                type="date"
                value={editDateEnd}
                onChange={(e) => setEditDateEnd(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                Tentukan tanggal target penyelesaian treatment
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updating}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleUpdate}
              disabled={updating || !editPartnershipId || !editDateEnd}
              className="gap-2"
            >
              {updating && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" />
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
