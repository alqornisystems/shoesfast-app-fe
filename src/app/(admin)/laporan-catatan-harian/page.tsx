"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { FileText, Calendar as CalendarIcon, Plus } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { api } from "@/lib/api"
import { formatDate } from "@/lib/utils"

interface NoteDetail {
  id: number
  title: string
  description: string
}

interface UserRow {
  id: number
  name: string
  role: string
  data: NoteDetail[][]
}

interface MatrixData {
  users: UserRow[]
  dates: number[]
  month: number
  year: number
  period: {
    start_date: number
    end_date: number
  }
}

interface User {
  id: number
  name: string
  phone: string
  role: string
}

interface SearchUsersResponse {
  data: User[]
}

interface CreateNoteResponse {
  message?: string
}

export default function LaporanCatatanHarianPage() {
  const [loading, setLoading] = useState(false)
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [searchUser, setSearchUser] = useState("")
  const [formData, setFormData] = useState({
    user_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    note: "",
    activities: "",
  })

  const months = [
    { value: "1", label: "Januari" },
    { value: "2", label: "Februari" },
    { value: "3", label: "Maret" },
    { value: "4", label: "April" },
    { value: "5", label: "Mei" },
    { value: "6", label: "Juni" },
    { value: "7", label: "Juli" },
    { value: "8", label: "Agustus" },
    { value: "9", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ]

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i)

  useEffect(() => {
    fetchMatrix()
  }, [])

  const fetchMatrix = async () => {
    setLoading(true)
    try {
      const data = await api.get<MatrixData>(
        `/api/reports/daily-notes-matrix?month=${currentMonth}&year=${currentYear}`
      )
      setMatrixData(data)
    } catch {
      toast.error("Gagal memuat laporan")
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (search: string) => {
    try {
      const data = await api.get<SearchUsersResponse>(
        `/api/daily-notes/search-users?search=${encodeURIComponent(search)}`
      )
      setUsers(data.data || [])
    } catch {
      toast.error("Gagal mencari karyawan")
    }
  }

  const handleSearchUser = (value: string) => {
    setSearchUser(value)
    if (value.length >= 2) {
      searchUsers(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.note.trim()) {
      toast.error("Catatan harus diisi")
      return
    }

    if (!formData.user_id) {
      toast.error("Pilih karyawan terlebih dahulu")
      return
    }

    setLoading(true)
    try {
      await api.post<CreateNoteResponse>("/api/daily-notes", {
        user_id: parseInt(formData.user_id),
        date: formData.date,
        note: formData.note,
        activities: formData.activities || null,
      })

      toast.success("Catatan berhasil dibuat!")
      setDialogOpen(false)
      resetForm()
      await fetchMatrix()
    } catch (error) {
      const e = error as CreateNoteResponse
      toast.error(e?.message || "Gagal membuat catatan")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      user_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      note: "",
      activities: "",
    })
    setSearchUser("")
    setUsers([])
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Catatan Harian</h1>
          <p className="text-muted-foreground">
            Catatan aktivitas harian karyawan (Format Matrix)
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Catatan
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
          <CardDescription>Pilih bulan dan tahun</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Bulan</Label>
              <Select
                value={currentMonth.toString()}
                onValueChange={(value) => setCurrentMonth(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tahun</Label>
              <Select
                value={currentYear.toString()}
                onValueChange={(value) => setCurrentYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="invisible">Action</Label>
              <Button onClick={fetchMatrix} disabled={loading} className="w-full">
                {loading ? "Memuat..." : "Tampilkan"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matrix Table */}
      {matrixData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Laporan Catatan Harian
            </CardTitle>
            <CardDescription>
              Periode: {formatDate(matrixData.period.start_date)} -{" "}
              {formatDate(matrixData.period.end_date)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border">
                <thead className="bg-primary text-primary-foreground">
                  <tr>
                    <th className="border p-2 text-center min-w-[50px]" rowSpan={2}>
                      No
                    </th>
                    <th className="border p-2 text-left min-w-[200px]" rowSpan={2}>
                      Nama
                    </th>
                    <th className="border p-2 text-center" colSpan={matrixData.dates.length}>
                      Tanggal
                    </th>
                  </tr>
                  <tr>
                    {matrixData.dates.map((date) => (
                      <th key={date} className="border p-2 text-center min-w-[150px]">
                        {date}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.users.map((user, index) => (
                    <tr key={user.id}>
                      <td className="border p-2 text-center">{index + 1}</td>
                      <td className="border p-2 text-left">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.role}</p>
                        </div>
                      </td>
                      {user.data.map((dayNotes, dayIndex) => (
                        <td key={dayIndex} className="border p-2 text-left align-top">
                          {dayNotes.length > 0 ? (
                            <div className="space-y-2">
                              {dayNotes.map((note) => (
                                <div key={note.id} className="bg-muted p-2 rounded text-xs">
                                  <p className="font-medium mb-1">{note.title}</p>
                                  {note.description && (
                                    <p className="text-muted-foreground whitespace-pre-wrap">
                                      {note.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!matrixData && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">
              Klik &quot;Tampilkan&quot; untuk melihat laporan
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog Create */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Tambah Catatan Harian</DialogTitle>
              <DialogDescription>
                Buat catatan aktivitas harian untuk karyawan
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Karyawan *</Label>
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Cari nama atau no. HP karyawan..."
                    value={searchUser}
                    onChange={(e) => handleSearchUser(e.target.value)}
                  />
                  {users.length > 0 && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {users.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, user_id: user.id.toString() })
                            setSearchUser(user.name)
                            setUsers([])
                          }}
                          className="w-full p-2 text-left hover:bg-muted border-b last:border-b-0"
                        >
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.phone} • {user.role}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.user_id && (
                    <p className="text-sm text-green-600">
                      ✓ Karyawan dipilih: {searchUser}
                    </p>
                  )}
                </div>
              </div>

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
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
