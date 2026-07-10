"use client"

import { useEffect, useState } from "react"
import { Search, Loader2, ChevronLeft, ChevronRight, UserPlus, Package, Clock, CheckCircle2, AlertTriangle, User } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
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
  users_id: number | null
  users_name: string | null
  partnerships_id: number | null
  status: number
  date_start: number
  date_end: number
  progress: number
  price: number
  note: string | null
  is_partnerships: number
  done_at: number | null
  created_at: number
  previous_treatment_done_at: number | null
  is_first_treatment: boolean
}

type Technician = {
  id: number
  name: string
  phone: string | null
  email: string
}

type PaginationData = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number
  to: number
}

const STORAGE_KEY_SEARCH = 'waiting_list_search'
const STORAGE_KEY_PAGE = 'waiting_list_page'

export function WaitingListClient() {
  const [treatments, setTreatments] = useState<Treatment[]>([])
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

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignType, setAssignType] = useState<"teknisi" | "mitra">("teknisi")
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("")
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("")
  const [dateStart, setDateStart] = useState<string>("")
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [assigning, setAssigning] = useState(false)

  async function fetchTreatments(page = 1) {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(15),
        page_type: "waiting_list",
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

      // Save current page to sessionStorage
      sessionStorage.setItem(STORAGE_KEY_PAGE, String(res.current_page ?? 1))
    } catch {
      setTreatments([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchTechnicians() {
    try {
      const res = await api.get<Technician[]>('/api/treatments/available-technicians')
      setTechnicians(res)
    } catch (error) {

    }
  }

  async function fetchPartners() {
    try {
      const res = await api.get<any>('/api/partnerships')
      setPartners(res.data || res)
    } catch (error) {

    }
  }

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedSearch = sessionStorage.getItem(STORAGE_KEY_SEARCH) || ''
    const savedPage = parseInt(sessionStorage.getItem(STORAGE_KEY_PAGE) || '1', 10)

    setSearch(savedSearch)
    setInitialized(true)
    fetchTreatments(savedPage)
  }, [])

  // Save search to sessionStorage and reset to page 1
  useEffect(() => {
    if (!initialized) return

    sessionStorage.setItem(STORAGE_KEY_SEARCH, search)

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

  function openAssignDialog() {
    if (selectedIds.length === 0) {
      toast.warning("Pilih minimal 1 treatment", {
        description: "Centang treatment yang ingin di-assign terlebih dahulu",
        duration: 3000,
      })
      return
    }
    // Set default date_start to today
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    setDateStart(`${yyyy}-${mm}-${dd}`)
    setAssignType("teknisi")
    setSelectedTechnicianId("")
    setSelectedPartnerId("")
    fetchTechnicians()
    fetchPartners()
    setAssignDialogOpen(true)
  }

  // Get today's date in YYYY-MM-DD format for min date validation
  function getTodayDate(): string {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  async function handleAssign() {
    if (assignType === "teknisi" && !selectedTechnicianId) {
      toast.error("Pilih teknisi terlebih dahulu")
      return
    }
    if (assignType === "mitra" && !selectedPartnerId) {
      toast.error("Pilih mitra terlebih dahulu")
      return
    }
    if (!dateStart) {
      toast.error("Tanggal mulai wajib diisi")
      return
    }

    setAssigning(true)
    try {
      const dateStartUnix = Math.floor(new Date(dateStart).getTime() / 1000)

      const payload: any = {
        treatment_ids: selectedIds,
        date_start: dateStartUnix,
      }

      let assigneeName = ""
      if (assignType === "teknisi") {
        payload.users_id = Number(selectedTechnicianId)
        const tech = technicians.find(t => t.id === Number(selectedTechnicianId))
        assigneeName = tech?.name || "Teknisi"
      } else {
        payload.partnerships_id = Number(selectedPartnerId)
        const partner = partners.find(p => p.id === Number(selectedPartnerId))
        assigneeName = partner?.name || "Mitra"
      }

      await api.post('/api/treatments/assign', payload)

      // Success toast
      toast.success(
        assignType === "teknisi"
          ? `${selectedIds.length} treatment berhasil di-assign ke ${assigneeName}`
          : `${selectedIds.length} treatment berhasil di-assign ke ${assigneeName}`,
        {
          description: `Tanggal mulai: ${new Date(dateStart).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}`,
          duration: 4000,
        }
      )

      setAssignDialogOpen(false)
      setSelectedIds([])
      setSelectedTechnicianId("")
      setSelectedPartnerId("")
      setDateStart("")
      fetchTreatments(pagination.current_page)
    } catch (error: any) {

      toast.error(
        "Gagal assign treatment",
        {
          description: error?.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.",
          duration: 4000,
        }
      )
    } finally {
      setAssigning(false)
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  function getImageUrl(photo: string | null): string | null {
    if (!photo) return null
    // If it starts with http:// or https://, it's already a full URL
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo
    }
    // Otherwise, it's a storage path
    return `/${photo.startsWith('storage/') ? photo : `storage/${photo}`}`
  }

  // Check if treatment is older than 2 weeks (14 days)
  function isOlderThan2Weeks(createdAt: number): boolean {
    const now = Math.floor(Date.now() / 1000) // Current time in seconds
    const twoWeeksInSeconds = 14 * 24 * 60 * 60 // 14 days in seconds
    return (now - createdAt) > twoWeeksInSeconds
  }

  // Get warning level based on age (with sequential logic)
  function getWarningLevel(treatment: Treatment): 'none' | 'warning' | 'danger' {
    const now = Math.floor(Date.now() / 1000)

    // For first treatment, use created_at
    // For subsequent treatments, use previous_treatment_done_at
    const referenceTime = treatment.is_first_treatment
      ? treatment.created_at
      : (treatment.previous_treatment_done_at || treatment.created_at)

    const ageInDays = (now - referenceTime) / (24 * 60 * 60)

    if (ageInDays > 21) return 'danger' // > 3 weeks: red
    if (ageInDays > 14) return 'warning' // > 2 weeks: yellow
    return 'none'
  }

  // Count warnings (backend already filters to show only first pending treatment)
  const warningCounts = treatments.reduce((acc, t) => {
    const level = getWarningLevel(t)
    if (level === 'danger') acc.danger++
    if (level === 'warning') acc.warning++
    return acc
  }, { warning: 0, danger: 0 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Waiting List Pengerjaan</h1>
          <p className="text-sm text-muted-foreground">
            Daftar item yang menunggu untuk dikerjakan oleh teknisi.
          </p>
        </div>
        {selectedIds.length > 0 && (
          <Button onClick={openAssignDialog} size="sm" className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Assign ke Teknisi ({selectedIds.length})
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari customer / item..."
              className="pl-8 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {warningCounts.danger > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {warningCounts.danger} Sangat Terlambat
            </Badge>
          )}
          {warningCounts.warning > 0 && (
            <Badge className="gap-1 bg-yellow-500 hover:bg-yellow-600 text-white">
              <Clock className="h-3 w-3" />
              {warningCounts.warning} Terlambat
            </Badge>
          )}
          <Badge variant="secondary" className="ml-auto">
            {pagination.total} item
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === treatments.length && treatments.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-12 hidden md:table-cell">#</TableHead>
              <TableHead>Order / Item</TableHead>
              <TableHead className="hidden lg:table-cell">Customer</TableHead>
              <TableHead className="hidden xl:table-cell">Teknisi</TableHead>
              <TableHead className="hidden lg:table-cell">Dibuat</TableHead>
              <TableHead className="hidden md:table-cell">Estimasi</TableHead>
              <TableHead className="text-right">Harga</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : treatments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-10 w-10 text-muted-foreground/50" />
                    <p>Tidak ada item di waiting list.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              treatments.map((treatment, idx) => {
                const warningLevel = getWarningLevel(treatment)
                const isSelected = selectedIds.includes(treatment.id)

                const rowClassName = cn(
                  "cursor-pointer transition-colors",
                  // Selected state (highest priority)
                  isSelected && "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500",
                  // Warning states (only if not selected)
                  !isSelected && warningLevel === 'danger' && 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500',
                  !isSelected && warningLevel === 'warning' && 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-500'
                )

                return (
                <TableRow
                  key={treatment.id}
                  className={rowClassName}
                  onClick={() => toggleSelection(treatment.id)}
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
                    <div className="flex items-center gap-3">
                      {getImageUrl(treatment.orders_items_photo) ? (
                        <img
                          src={getImageUrl(treatment.orders_items_photo)!}
                          alt={treatment.orders_items_name}
                          className="h-12 w-12 rounded-lg object-cover border"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted border">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-base">{treatment.orders_items_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {treatment.orders_code}
                        </div>
                        <div className="text-xs text-muted-foreground lg:hidden truncate">
                          {treatment.customers_name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="max-w-[200px]">
                      <div className="font-medium text-sm truncate">{treatment.customers_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{treatment.customers_phone}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{treatment.users_name || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="text-sm text-muted-foreground">
                      {formatDate(treatment.created_at)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(() => {
                        const now = Math.floor(Date.now() / 1000)
                        const referenceTime = treatment.is_first_treatment
                          ? treatment.created_at
                          : (treatment.previous_treatment_done_at || treatment.created_at)
                        const ageInDays = Math.floor((now - referenceTime) / (24 * 60 * 60))
                        return `${ageInDays} hari lalu`
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {treatment.services_estimation} hari
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-semibold text-sm">
                      {formatCurrency(treatment.price)}
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

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Assign Treatment</DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">
              Assign {selectedIds.length} treatment kepada teknisi atau mitra kerja
            </p>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Info Badge */}
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-blue-900">
                  {selectedIds.length} Treatment Dipilih
                </div>
                <div className="text-xs text-blue-700">
                  Treatment akan langsung dimulai sesuai tanggal yang dipilih
                </div>
              </div>
            </div>

            {/* Type Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Assign Kepada <span className="text-destructive">*</span>
              </Label>
              <Select
                value={assignType}
                onValueChange={(val: "teknisi" | "mitra") => {
                  setAssignType(val)
                  setSelectedTechnicianId("")
                  setSelectedPartnerId("")
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teknisi">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      <span>Teknisi Internal</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="mitra">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>Mitra Kerja</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Technician Selection */}
            {assignType === "teknisi" && (
              <div className="space-y-2">
                <Label htmlFor="technician" className="text-sm font-semibold">
                  Pilih Teknisi <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedTechnicianId}
                  onValueChange={setSelectedTechnicianId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="-- Pilih Teknisi --" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        Tidak ada teknisi tersedia
                      </div>
                    ) : (
                      technicians.map((tech) => (
                        <SelectItem key={tech.id} value={String(tech.id)}>
                          <div className="flex items-start gap-2 py-1">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold text-xs">
                              {tech.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{tech.name}</div>
                              {tech.phone && (
                                <div className="text-xs text-muted-foreground">{tech.phone}</div>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Partner Selection */}
            {assignType === "mitra" && (
              <div className="space-y-2">
                <Label htmlFor="partner" className="text-sm font-semibold">
                  Pilih Mitra <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedPartnerId}
                  onValueChange={setSelectedPartnerId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="-- Pilih Mitra --" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        Tidak ada mitra tersedia
                      </div>
                    ) : (
                      partners.map((partner) => (
                        <SelectItem key={partner.id} value={String(partner.id)}>
                          <div className="flex items-start gap-2 py-1">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-semibold text-xs">
                              {partner.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{partner.name}</div>
                              {partner.phone && (
                                <div className="text-xs text-muted-foreground">{partner.phone}</div>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Start */}
            <div className="space-y-2">
              <Label htmlFor="dateStart" className="text-sm font-semibold">
                Tanggal Mulai Pengerjaan <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="dateStart"
                  type="date"
                  value={dateStart}
                  min={getTodayDate()}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="h-11"
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              <p className="text-xs text-muted-foreground">
                Treatment akan dimulai pada tanggal yang dipilih
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
              disabled={assigning}
              className="flex-1 sm:flex-none"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              disabled={assigning || (assignType === "teknisi" ? !selectedTechnicianId : !selectedPartnerId) || !dateStart}
              className="gap-2 flex-1 sm:flex-none"
            >
              {assigning && <Loader2 className="h-4 w-4 animate-spin" />}
              <UserPlus className="h-4 w-4" />
              Assign Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
