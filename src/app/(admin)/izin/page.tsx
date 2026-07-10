"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Plus, Clock, CheckCircle, XCircle, Calendar, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"

interface Absence {
  id: number
  user_id: number
  user_name: string
  type: number
  type_label: string
  date_start: number
  date_end: number
  total_days: number
  note: string
  photo: string | null
  is_approval: number
  approval_label: string
  created_at: number
}

interface Holiday {
  id: number
  date: number
  name: string
  description: string | null
}

export default function IzinPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [absences, setAbsences] = useState<Absence[]>([])
  const [todayHoliday, setTodayHoliday] = useState<Holiday | null>(null)
  const [formData, setFormData] = useState({
    type: "1",
    date_start: "",
    date_end: "",
    note: "",
    photo: "",
  })

  useEffect(() => {
    fetchAbsences()
    fetchTodayHoliday()
  }, [])

  const fetchAbsences = async () => {
    try {
      const data = await api.get<any>(`/api/absences`)
      setAbsences(data.data || [])
    } catch (error: any) {
      console.error(error)
    }
  }

  const fetchTodayHoliday = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd")

      const params = new URLSearchParams({
        start_date: today,
        end_date: today,
      })

      const data = await api.get<any>(`/api/holidays?${params}`)
      if (data.data && data.data.length > 0) {
        setTodayHoliday(data.data[0])
      }
    } catch (error: any) {
      console.error("Error fetching holiday:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date_start || !formData.date_end || !formData.note) {
      toast.error("Semua field harus diisi")
      return
    }

    // Check if photo is required for sick leave (type 0)
    if (formData.type === "0" && !formData.photo) {
      toast.error("Bukti/foto wajib diupload untuk jenis Sakit")
      return
    }

    // Check if start or end date is a holiday or Sunday
    const startDate = new Date(formData.date_start)
    const endDate = new Date(formData.date_end)

    // Check Sunday
    if (startDate.getDay() === 0) {
      toast.error("Tidak dapat mengajukan izin untuk hari Minggu")
      return
    }

    if (endDate.getDay() === 0) {
      toast.error("Tidak dapat mengajukan izin untuk hari Minggu")
      return
    }

    // Check holidays for date range
    const startTimestamp = Math.floor(startDate.getTime() / 1000)
    const endTimestamp = Math.floor(endDate.getTime() / 1000)

    // Fetch holidays for the date range
    try {
      const params = new URLSearchParams({
        start_date: formData.date_start,
        end_date: formData.date_end,
      })

      const data = await api.get<any>(`/api/holidays?${params}`)
      if (data.data && data.data.length > 0) {
        const holidayNames = data.data.map((h: Holiday) => h.name).join(", ")
        toast.error(`Tidak dapat mengajukan izin di hari libur: ${holidayNames}`)
        return
      }
    } catch (error) {
      console.error("Error checking holidays:", error)
    }

    setLoading(true)
    try {
      await api.post(`/api/absences`, formData)

      toast.success("Pengajuan izin berhasil dibuat!")
      setDialogOpen(false)
      setFormData({ type: "1", date_start: "", date_end: "", note: "", photo: "" })
      await fetchAbsences()
    } catch (err) {
      const e = err as { message?: string; errors?: Record<string, string[]> }
      toast.error(e.message || "Gagal mengajukan izin")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      await api.put(`/api/absences/${id}/approve`)

      toast.success("Pengajuan disetujui")
      await fetchAbsences()
    } catch (err) {
      const e = err as { message?: string; errors?: Record<string, string[]> }
      toast.error(e.message || "Gagal menyetujui")
    }
  }

  const handleReject = async (id: number) => {
    try {
      await api.put(`/api/absences/${id}/reject`)

      toast.success("Pengajuan ditolak")
      await fetchAbsences()
    } catch (err) {
      const e = err as { message?: string; errors?: Record<string, string[]> }
      toast.error(e.message || "Gagal menolak")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus pengajuan ini?")) return

    try {
      await api.delete(`/api/absences/${id}`)

      toast.success("Pengajuan dihapus")
      await fetchAbsences()
    } catch (err) {
      const e = err as { message?: string; errors?: Record<string, string[]> }
      toast.error(e.message || "Gagal menghapus")
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB")
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      // Remove data URL prefix
      const base64Data = base64String.split(",")[1]
      setFormData({ ...formData, photo: base64Data })
    }
    reader.readAsDataURL(file)
  }

  const handleDateStartChange = (date: string) => {
    // Auto-set date_end to be the same as date_start
    setFormData({ ...formData, date_start: date, date_end: date })
  }

  const getTypeBadgeColor = (type: number) => {
    switch (type) {
      case 0: return "bg-red-100 text-red-800 border-red-200"
      case 1: return "bg-blue-100 text-blue-800 border-blue-200"
      case 2: return "bg-purple-100 text-purple-800 border-purple-200"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getApprovalBadge = (status: number) => {
    switch (status) {
      case 0: return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">Pending</Badge>
      case 1: return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Disetujui</Badge>
      case 2: return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Ditolak</Badge>
      default: return null
    }
  }

  const pending = absences.filter(a => a.is_approval === 0).length
  const approved = absences.filter(a => a.is_approval === 1).length
  const rejected = absences.filter(a => a.is_approval === 2).length

  const canApprove = user?.is_super_admin || user?.role === "HRD" || user?.role === "Admin"
  const isSunday = new Date().getDay() === 0

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengajuan Izin</h1>
          <p className="text-muted-foreground">Kelola izin, sakit, dan cuti karyawan</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajukan Izin
        </Button>
      </div>

      {/* Holiday Alert */}
      {(todayHoliday || isSunday) && (
        <Alert className="border-red-300 bg-red-50">
          <Calendar className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>Hari Libur:</strong>{" "}
            {todayHoliday ? todayHoliday.name : "Hari Minggu"}
            {todayHoliday?.description && ` - ${todayHoliday.description}`}
            <br />
            <span className="text-sm">Tidak dapat mengajukan izin untuk hari libur</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              {pending}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Menunggu approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disetujui</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {approved}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ditolak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              {rejected}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Daftar Pengajuan */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengajuan Izin</CardTitle>
          <CardDescription>Riwayat pengajuan izin, sakit, dan cuti</CardDescription>
        </CardHeader>
        <CardContent>
          {absences.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Belum ada pengajuan izin</p>
              <p className="text-xs mt-1">Klik "Ajukan Izin" untuk membuat pengajuan baru</p>
            </div>
          ) : (
            <div className="space-y-4">
              {absences.map((absence) => (
                <div key={absence.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getTypeBadgeColor(absence.type)}>
                          {absence.type_label}
                        </Badge>
                        {getApprovalBadge(absence.is_approval)}
                      </div>
                      <p className="font-medium">{absence.user_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(absence.date_start * 1000), "dd MMM yyyy", { locale: idLocale })}
                          {" - "}
                          {format(new Date(absence.date_end * 1000), "dd MMM yyyy", { locale: idLocale })}
                        </span>
                        <span className="text-xs">({absence.total_days} hari)</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {canApprove && absence.is_approval === 0 && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleApprove(absence.id)}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Setuju
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(absence.id)}>
                            <XCircle className="h-4 w-4 mr-1" />
                            Tolak
                          </Button>
                        </>
                      )}
                      {absence.is_approval === 0 && (
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(absence.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{absence.note}</p>
                  {absence.photo && (
                    <div className="mt-2">
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL}/storage/absences/${absence.photo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        Lihat Bukti
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Ajukan Izin/Sakit/Cuti</DialogTitle>
              <DialogDescription>
                Isi form di bawah untuk mengajukan izin
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Jenis Izin</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value, photo: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sakit</SelectItem>
                    <SelectItem value="1">Izin</SelectItem>
                    <SelectItem value="2">Cuti</SelectItem>
                  </SelectContent>
                </Select>
                {formData.type === "0" && (
                  <p className="text-xs text-orange-600">
                    * Jenis Sakit wajib melampirkan bukti (Surat Dokter/Foto)
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Input
                    type="date"
                    value={formData.date_start}
                    onChange={(e) => handleDateStartChange(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Selesai</Label>
                  <Input
                    type="date"
                    value={formData.date_end}
                    onChange={(e) => setFormData({ ...formData, date_end: e.target.value })}
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                * Tidak dapat mengajukan izin untuk hari Minggu atau hari libur
              </p>

              <div className="space-y-2">
                <Label>
                  Bukti/Foto {formData.type === "0" && <span className="text-red-600">*</span>}
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  required={formData.type === "0"}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.type === "0"
                    ? "* Wajib upload bukti untuk jenis Sakit (Surat Dokter/Foto)"
                    : "Opsional - Upload bukti pendukung (max 5MB)"}
                </p>
                {formData.photo && (
                  <div className="mt-2">
                    <p className="text-xs text-green-600">✓ Foto berhasil diupload</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Keterangan</Label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Alasan izin..."
                  rows={4}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Mengirim..." : "Ajukan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
