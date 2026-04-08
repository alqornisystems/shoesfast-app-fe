"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Calendar, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, fromUnixTime, addMonths, subMonths } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface DailyNote {
  id: number
  user_id: number
  user_name: string
  branch_name: string
  date: number
  note: string
  activities: string | null
  status: number
  created_at: number
}

interface Holiday {
  id: number
  date: number
  name: string
  description: string | null
  branch_id: number | null
  branch_name: string
}

export default function CatatanHarianPage() {
  const [loading, setLoading] = useState(false)
  const [loadingHolidays, setLoadingHolidays] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [todayNote, setTodayNote] = useState<DailyNote | null>(null)
  const [notes, setNotes] = useState<DailyNote[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [formData, setFormData] = useState({
    id: 0,
    user_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    note: "",
    activities: "",
  })

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    fetchTodayNote()
    fetchNotes()
    fetchHolidays()
  }, [currentMonth])

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("sf_token")
      const userStr = localStorage.getItem("sf_user")
      if (userStr) {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
      }
    } catch (error: any) {
      console.error("Error loading user:", error)
    }
  }

  const fetchTodayNote = async () => {
    try {
      const token = localStorage.getItem("sf_token")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/daily-notes/today`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) throw new Error("Failed to fetch")

      const data = await response.json()
      setTodayNote(data.data)
    } catch (error: any) {
      // Silent error - today note might not exist
    }
  }

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem("sf_token")
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)

      const params = new URLSearchParams({
        start_date: format(monthStart, "yyyy-MM-dd"),
        end_date: format(monthEnd, "yyyy-MM-dd"),
      })

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/daily-notes?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) throw new Error("Failed to fetch")

      const data = await response.json()
      setNotes(data.data || [])
    } catch (error: any) {
      toast.error("Gagal memuat catatan")
    }
  }

  const fetchHolidays = async () => {
    setLoadingHolidays(true)
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
      // Silent error - holidays are optional
      console.error("Error fetching holidays:", error)
    } finally {
      setLoadingHolidays(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.note.trim()) {
      toast.error("Catatan harus diisi")
      return
    }

    // Check if selected date is a holiday
    const selectedDate = new Date(formData.date)
    const selectedDateTimestamp = Math.floor(selectedDate.getTime() / 1000)

    const isHoliday = holidays.some((holiday) => {
      const holidayDate = new Date(holiday.date * 1000)
      return isSameDay(holidayDate, selectedDate)
    })

    const isSunday = selectedDate.getDay() === 0

    if (isHoliday) {
      const holiday = holidays.find((h) => {
        const holidayDate = new Date(h.date * 1000)
        return isSameDay(holidayDate, selectedDate)
      })
      toast.error(`Tidak dapat membuat catatan di hari libur: ${holiday?.name}`)
      return
    }

    if (isSunday) {
      toast.error("Tidak dapat membuat catatan di hari Minggu")
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem("sf_token")
      const url = editMode
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/daily-notes/${formData.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/daily-notes`

      const body: any = {
        date: formData.date,
        note: formData.note,
        activities: formData.activities || null,
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
        toast.error(data.message || `Gagal ${editMode ? "mengupdate" : "membuat"} catatan`)
        return
      }

      toast.success(`Catatan berhasil ${editMode ? "diupdate" : "dibuat"}!`)
      setDialogOpen(false)
      resetForm()
      await fetchTodayNote()
      await fetchNotes()
    } catch (error: any) {
      toast.error("Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (note: DailyNote) => {
    setEditMode(true)
    setFormData({
      id: note.id,
      user_id: note.user_id.toString(),
      date: format(new Date(note.date * 1000), "yyyy-MM-dd"),
      note: note.note,
      activities: note.activities || "",
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus catatan ini?")) return

    try {
      const token = localStorage.getItem("sf_token")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/daily-notes/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) throw new Error("Failed")

      toast.success("Catatan berhasil dihapus")
      await fetchTodayNote()
      await fetchNotes()
    } catch (error: any) {
      toast.error("Gagal menghapus catatan")
    }
  }

  const handleToggleDone = async (note: DailyNote) => {
    try {
      const token = localStorage.getItem("sf_token")
      const newStatus = note.status === 1 ? 0 : 1

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/daily-notes/${note.id}/toggle-status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      )

      if (!response.ok) throw new Error("Failed")

      toast.success(newStatus === 1 ? "Catatan ditandai selesai" : "Catatan ditandai belum selesai")
      await fetchTodayNote()
      await fetchNotes()
    } catch (error: any) {
      toast.error("Gagal mengubah status catatan")
    }
  }

  const resetForm = () => {
    setEditMode(false)

    setFormData({
      id: 0,
      user_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      note: "",
      activities: "",
    })
  }

  const handleOpenDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  // Show loading while holidays are being fetched
  if (loadingHolidays) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Memuat kalender...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catatan Harian</h1>
          <p className="text-muted-foreground">Kelola catatan harian karyawan</p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Catatan
        </Button>
      </div>

      {/* Catatan Harian - Matrix Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{format(currentMonth, "MMMM yyyy", { locale: idLocale })}</CardTitle>
              <CardDescription>Kalender catatan harian karyawan</CardDescription>
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

                {/* Days in month - Grid format */}
                {daysInMonth.map((day) => {
                  const dayString = format(day, 'yyyy-MM-dd')
                  const dayNote = notes.find((note) => {
                    const noteDate = fromUnixTime(note.date)
                    const noteDateString = format(noteDate, 'yyyy-MM-dd')
                    return dayString === noteDateString
                  })
                  const dayHoliday = holidays.find((holiday) => {
                    const holidayDate = fromUnixTime(holiday.date)
                    const holidayDateString = format(holidayDate, 'yyyy-MM-dd')
                    return dayString === holidayDateString
                  })
                  const isToday = isSameDay(day, today)
                  const isPast = day < today && !isToday
                  const isSunday = day.getDay() === 0
                  const isHoliday = !!dayHoliday
                  const isMissingNote = isPast && !dayNote && !isSunday && !isHoliday

                  return (
                    <div
                      key={day.toISOString()}
                      className={`
                        border rounded-lg p-2 min-h-[100px] flex flex-col
                        ${isToday ? 'border-primary bg-primary/5' : ''}
                        ${dayNote ? 'bg-muted/50' : ''}
                        ${isSunday || isHoliday ? 'border-red-300 bg-red-50/50' : ''}
                        ${isMissingNote ? 'border-red-500 bg-red-50' : ''}
                      `}
                    >
                      {/* Date header */}
                      <div className="flex items-start justify-between mb-1">
                        <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''} ${isMissingNote ? 'text-red-600' : ''}`}>
                          {format(day, 'd')}
                        </span>
                        {dayNote && (
                          <Checkbox
                            checked={dayNote.status === 1}
                            onCheckedChange={() => handleToggleDone(dayNote)}
                            className="h-4 w-4"
                          />
                        )}
                      </div>

                      {/* Holiday/Sunday label */}
                      {isHoliday && dayHoliday && (
                        <p className="text-[10px] text-red-600 font-medium mb-1" title={dayHoliday.description || undefined}>
                          {dayHoliday.name}
                        </p>
                      )}
                      {isSunday && !isHoliday && (
                        <p className="text-[10px] text-red-600 font-medium mb-1">Minggu</p>
                      )}

                      {/* Note content */}
                      {dayNote ? (
                        <div className="flex-1 min-h-0">
                          <p className="text-xs line-clamp-2 mb-1">
                            {dayNote.note}
                          </p>
                          {dayNote.activities && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1">
                              {dayNote.activities}
                            </p>
                          )}
                          <div className="flex gap-1 mt-auto">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => handleEdit(dayNote)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => handleDelete(dayNote.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : !isPast || isToday ? (
                        !isSunday && !isHoliday && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-6 mt-auto"
                            onClick={() => {
                              setFormData({
                                id: 0,
                                user_id: "",
                                date: format(day, "yyyy-MM-dd"),
                                note: "",
                                activities: "",
                              })
                              setDialogOpen(true)
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Tambah
                          </Button>
                        )
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
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editMode ? "Edit Catatan" : "Tambah Catatan Harian"}</DialogTitle>
              <DialogDescription>
                {editMode ? "Update catatan harian" : "Buat catatan aktivitas hari ini"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  disabled={editMode}
                />
                <p className="text-xs text-muted-foreground">
                  * Tidak dapat membuat catatan di hari Minggu atau hari libur
                </p>
              </div>

              <div className="space-y-2">
                <Label>Catatan *</Label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Tulis catatan harian..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Aktivitas (Opsional)</Label>
                <Textarea
                  value={formData.activities}
                  onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                  placeholder="Detail aktivitas yang dikerjakan..."
                  rows={3}
                />
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
