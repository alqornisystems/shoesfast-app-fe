"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, fromUnixTime, addMonths, subMonths } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Holiday {
  id: number
  date: number
  name: string
  description: string | null
  branch_id: number | null
  branch_name: string
  created_at: number
}

interface Branch {
  id: number
  name: string
}

export default function KalenderLiburPage() {
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [formData, setFormData] = useState({
    id: 0,
    date: format(new Date(), "yyyy-MM-dd"),
    name: "",
    description: "",
    branch_id: "",
  })

  useEffect(() => {
    fetchBranches()
    fetchHolidays()
  }, [currentMonth])

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem("sf_token")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/projects`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) throw new Error("Failed to fetch")

      const data = await response.json()
      setBranches(data.data || [])
    } catch (error: any) {
      console.error("Error fetching branches:", error)
    }
  }

  const fetchHolidays = async () => {
    try {
      const token = localStorage.getItem("sf_token")
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)

      const params = new URLSearchParams({
        start_date: format(monthStart, "yyyy-MM-dd"),
        end_date: format(monthEnd, "yyyy-MM-dd"),
      })

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/holidays?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) throw new Error("Failed to fetch")

      const data = await response.json()
      setHolidays(data.data || [])
    } catch (error: any) {
      toast.error("Gagal memuat kalender libur")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("Nama hari libur harus diisi")
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem("sf_token")
      const url = editMode
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/holidays/${formData.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/holidays`

      const body: any = {
        date: formData.date,
        name: formData.name,
        description: formData.description || null,
        branch_id: formData.branch_id || null,
      }

      const response = await fetch(url, {
        method: editMode ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message || `Gagal ${editMode ? "mengupdate" : "membuat"} hari libur`)
        return
      }

      toast.success(`Hari libur berhasil ${editMode ? "diupdate" : "ditambahkan"}!`)
      setDialogOpen(false)
      resetForm()
      await fetchHolidays()
    } catch (error: any) {
      toast.error("Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (holiday: Holiday) => {
    setEditMode(true)
    setFormData({
      id: holiday.id,
      date: format(fromUnixTime(holiday.date), "yyyy-MM-dd"),
      name: holiday.name,
      description: holiday.description || "",
      branch_id: holiday.branch_id?.toString() || "",
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus hari libur ini?")) return

    try {
      const token = localStorage.getItem("sf_token")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/holidays/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) throw new Error("Failed")

      toast.success("Hari libur berhasil dihapus")
      await fetchHolidays()
    } catch (error: any) {
      toast.error("Gagal menghapus hari libur")
    }
  }

  const resetForm = () => {
    setEditMode(false)
    setFormData({
      id: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      name: "",
      description: "",
      branch_id: "",
    })
  }

  const handleOpenDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kalender Libur</h1>
          <p className="text-muted-foreground">Kelola hari libur untuk semua karyawan</p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Hari Libur
        </Button>
      </div>

      {/* Calendar Matrix */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Kalender Hari Libur</CardTitle>
              <CardDescription>
                {format(currentMonth, "MMMM yyyy", { locale: idLocale })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Hari Ini
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const today = new Date()
            const monthStart = startOfMonth(currentMonth)
            const monthEnd = endOfMonth(currentMonth)
            const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

            return (
              <div className="grid grid-cols-7 gap-2">
                {/* Header Days */}
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-muted-foreground p-2">
                    {day}
                  </div>
                ))}

                {/* Empty cells for days before month starts */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2" />
                ))}

                {/* Days in month */}
                {daysInMonth.map((day) => {
                  const dayHolidays = holidays.filter((holiday) =>
                    isSameDay(fromUnixTime(holiday.date), day)
                  )
                  const isToday = isSameDay(day, today)
                  const isSunday = day.getDay() === 0
                  const hasHoliday = dayHolidays.length > 0

                  return (
                    <div
                      key={day.toISOString()}
                      className={`
                        border rounded-lg p-2 min-h-[100px] flex flex-col
                        ${isToday ? 'border-primary bg-primary/5' : ''}
                        ${isSunday ? 'border-red-300 bg-red-50/50' : ''}
                        ${hasHoliday ? 'border-orange-400 bg-orange-50' : ''}
                      `}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className={`text-xs font-medium ${isToday ? 'text-primary' : ''} ${isSunday ? 'text-red-600' : ''}`}>
                          {format(day, 'd')}
                        </span>
                      </div>

                      {isSunday && (
                        <p className="text-[10px] text-red-600 font-medium mb-1">Minggu</p>
                      )}

                      {dayHolidays.length > 0 ? (
                        <div className="flex-1 space-y-1">
                          {dayHolidays.map((holiday) => (
                            <div key={holiday.id} className="text-xs space-y-1">
                              <p className="font-medium text-orange-700 line-clamp-2">
                                {holiday.name}
                              </p>
                              {holiday.description && (
                                <p className="text-[10px] text-muted-foreground line-clamp-1">
                                  {holiday.description}
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground">
                                {holiday.branch_name}
                              </p>
                              <div className="flex gap-1 mt-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={() => handleEdit(holiday)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={() => handleDelete(holiday.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : !isSunday ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-6 mt-auto"
                          onClick={() => {
                            setFormData({
                              id: 0,
                              date: format(day, "yyyy-MM-dd"),
                              name: "",
                              description: "",
                              branch_id: "",
                            })
                            setDialogOpen(true)
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Tambah
                        </Button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editMode ? "Edit Hari Libur" : "Tambah Hari Libur"}</DialogTitle>
              <DialogDescription>
                {editMode ? "Update hari libur" : "Tambah hari libur untuk karyawan"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Nama Hari Libur *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Tahun Baru Imlek"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Deskripsi (Opsional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Keterangan tambahan..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Cabang (Kosongkan untuk semua cabang)</Label>
                <Select
                  value={formData.branch_id || "all"}
                  onValueChange={(value) => setFormData({ ...formData, branch_id: value === "all" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih cabang atau kosongkan untuk semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Cabang</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  resetForm()
                }}
              >
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : editMode ? "Update" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
