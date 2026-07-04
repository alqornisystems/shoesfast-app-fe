"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, Download, CheckCircle, Clock, XCircle, FileCheck } from "lucide-react"
import { toast } from "sonner"
import { format, getDaysInMonth, getDay } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { api } from "@/lib/api"

interface User {
  id: number
  name: string
  role?: string
}

interface AttendanceData {
  user_id: number
  user_name: string
  date: number
  clock_in: number | null
  clock_out: number | null
  status: string // 'present', 'late', 'absent', 'leave'
  leave_type?: string
}

interface AbsenceData {
  user_id: number
  date_start: number
  date_end: number
  type: number // 0=sakit, 1=izin, 2=cuti
  is_approval: number
}

// Raw shapes returned by the backend
interface RawClockPunch {
  time: number
}

interface RawAttendance {
  user_id: number
  user_name: string
  date: string
  clock_in?: RawClockPunch | null
  clock_out?: RawClockPunch | null
}

interface RawAbsence {
  user_id: number
  date_start: number
  date_end: number
  type: number
  is_approval: number
}

interface RawUser {
  id: number
  name: string
  role?: string
  is_deleted?: number
}

interface ListResponse<T> {
  data?: T[]
}

export default function LaporanAbsensiPage() {
  const [loading, setLoading] = useState(false)
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([])
  const [absences, setAbsences] = useState<AbsenceData[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"))
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [selectedCompany, setSelectedCompany] = useState<string>("PT. Shoesfast Indonesia")

  // Available roles
  const roles = [
    "Admin Super",
    "Kurir",
    "Teknisi",
    "Admin",
    "HRD",
    "Finance",
    "Admin Sosmed",
    "Admin Crm",
    "Supervisor/Lead"
  ]

  useEffect(() => {
    if (selectedMonth) {
      fetchReport()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedRole])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const [year, month] = selectedMonth.split("-")
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

      const params = new URLSearchParams({
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        report_mode: "true", // Enable report mode to get all users
      })

      // Fetch attendances, absences, and users in parallel.
      // Attendances is required; absences/users are tolerated if they fail.
      const [attendancesData, absencesData, usersData] = await Promise.all([
        api.get<ListResponse<RawAttendance>>(`/api/attendances?${params}`),
        api
          .get<ListResponse<RawAbsence>>(`/api/absences?${params}`)
          .catch(() => ({ data: [] as RawAbsence[] })),
        api
          .get<ListResponse<RawUser> | RawUser[]>(`/api/users`)
          .catch(() => ({ data: [] as RawUser[] })),
      ])

      // Get users from users API and filter by selected role if needed
      const usersArray: RawUser[] = Array.isArray(usersData) ? usersData : usersData.data ?? []
      let usersFromApi: User[] = usersArray
        .filter((u) => u.is_deleted === 0 || u.is_deleted === undefined)
        .map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
        }))

      // Filter by role if selected
      if (selectedRole) {
        usersFromApi = usersFromApi.filter((u) => u.role === selectedRole)
      }

      setUsers(usersFromApi)

      // Store absences data
      if (absencesData.data && Array.isArray(absencesData.data)) {
        const transformedAbsences: AbsenceData[] = absencesData.data
          .filter((a) => a.is_approval === 1) // Only approved absences
          .map((a) => ({
            user_id: a.user_id,
            date_start: a.date_start,
            date_end: a.date_end,
            type: a.type,
            is_approval: a.is_approval,
          }))
        setAbsences(transformedAbsences)
      } else {
        setAbsences([])
      }

      // Transform attendance data
      if (attendancesData.data && Array.isArray(attendancesData.data)) {
        const transformedData: AttendanceData[] = attendancesData.data.map((item) => {
          const itemDate = new Date(item.date)

          // Check if late (masuk setelah jam 8:00)
          const clockInTime = item.clock_in ? new Date(item.clock_in.time * 1000) : null
          const isLate = clockInTime ? clockInTime.getHours() >= 8 : false

          return {
            user_id: item.user_id,
            user_name: item.user_name,
            date: Math.floor(itemDate.getTime() / 1000),
            clock_in: item.clock_in?.time || null,
            clock_out: item.clock_out?.time || null,
            status: item.clock_in ? (isLate ? 'late' : 'present') : 'absent',
          }
        })

        setAttendanceData(transformedData)
      } else {
        setAttendanceData([])
      }
    } catch (error) {
      console.error("Error fetching report:", error)
      toast.error("Gagal memuat laporan")
      setAttendanceData([])
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const getAttendanceStatus = (userId: number, day: number) => {
    const [year, month] = selectedMonth.split("-")
    const date = new Date(parseInt(year), parseInt(month) - 1, day)
    const dayOfWeek = date.getDay()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)

    // Skip Sundays - don't mark as absent
    if (dayOfWeek === 0) {
      return { symbol: "", className: "" }
    }

    // Skip future dates - don't mark as absent
    if (checkDate > today) {
      return { symbol: "", className: "" }
    }

    // Check if user has approved absence on this date
    const dateTimestamp = Math.floor(checkDate.getTime() / 1000)
    const hasAbsence = absences.find(
      (absence) =>
        absence.user_id === userId &&
        dateTimestamp >= absence.date_start &&
        dateTimestamp <= absence.date_end
    )

    if (hasAbsence) {
      // User has approved absence (izin/sakit/cuti)
      return { symbol: "I", className: "text-blue-600 font-bold" }
    }

    // Check attendance data
    const attendance = attendanceData.find(
      (a) => a.user_id === userId &&
             new Date(a.date * 1000).getDate() === day
    )

    // If no attendance and no absence, mark as absent (Alpha) - only for past dates
    if (!attendance && checkDate < today) {
      return { symbol: "A", className: "text-red-600 font-bold" }
    }

    // If it's today and no attendance yet, show empty
    if (!attendance && checkDate.getTime() === today.getTime()) {
      return { symbol: "", className: "" }
    }

    if (!attendance) {
      return { symbol: "", className: "" }
    }

    switch (attendance.status) {
      case "present":
        return { symbol: "✓", className: "text-green-600 font-bold" }
      case "late":
        return { symbol: "T", className: "text-orange-600 font-bold" }
      case "absent":
        return { symbol: "A", className: "text-red-600 font-bold" }
      case "leave":
        return { symbol: "I", className: "text-blue-600 font-bold" }
      default:
        return { symbol: "", className: "" }
    }
  }

  const getDayOfWeek = (day: number) => {
    const [year, month] = selectedMonth.split("-")
    const date = new Date(parseInt(year), parseInt(month) - 1, day)
    return getDay(date)
  }

  const getDayName = (day: number) => {
    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
    return dayNames[getDayOfWeek(day)]
  }

  const calculateSummaryStats = () => {
    const [year, month] = selectedMonth.split("-")
    const daysInMonth = getDaysInMonth(new Date(parseInt(year), parseInt(month) - 1))

    let totalPresent = 0
    let totalLate = 0
    let totalAbsent = 0
    let totalLeave = 0

    users.forEach((user) => {
      for (let day = 1; day <= daysInMonth; day++) {
        const { symbol } = getAttendanceStatus(user.id, day)
        if (symbol === "✓") totalPresent++
        else if (symbol === "T") totalLate++
        else if (symbol === "A") totalAbsent++
        else if (symbol === "I") totalLeave++
      }
    })

    return { totalPresent, totalLate, totalAbsent, totalLeave }
  }

  const renderCalendar = () => {
    const [year, month] = selectedMonth.split("-")
    const daysInMonth = getDaysInMonth(new Date(parseInt(year), parseInt(month) - 1))
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Header */}
          <div className="flex border-b-2 border-gray-300">
            <div className="w-48 p-2 font-bold border-r-2 border-gray-300 bg-gray-50">
              Nama Karyawan
            </div>
            <div className="flex flex-1">
              {days.map((day) => {
                const dayOfWeek = getDayOfWeek(day)
                const isSunday = dayOfWeek === 0
                return (
                  <div
                    key={day}
                    className={`flex-1 min-w-[32px] text-center border-r border-gray-300 ${
                      isSunday ? "bg-red-50" : "bg-gray-50"
                    }`}
                  >
                    <div className={`text-xs font-semibold ${isSunday ? "text-red-600" : "text-gray-600"}`}>
                      {getDayName(day)}
                    </div>
                    <div className={`text-sm font-bold p-1 ${isSunday ? "text-red-600" : ""}`}>
                      {day}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rows */}
          {users.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
              Tidak ada data karyawan untuk periode ini
            </div>
          )}

          {users.map((user, index) => (
            <div
              key={user.id}
              className={`flex border-b border-gray-300 ${
                index % 2 === 0 ? "bg-white" : "bg-gray-50"
              }`}
            >
              <div className="w-48 p-2 font-medium border-r-2 border-gray-300">
                {user.name}
              </div>
              <div className="flex flex-1">
                {days.map((day) => {
                  const dayOfWeek = getDayOfWeek(day)
                  const isSunday = dayOfWeek === 0
                  const { symbol, className } = getAttendanceStatus(user.id, day)

                  return (
                    <div
                      key={day}
                      className={`flex-1 min-w-[32px] text-center p-1 border-r border-gray-300 ${
                        isSunday ? "bg-red-50" : ""
                      }`}
                    >
                      <span className={className}>{symbol}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const handleExport = () => {
    toast.info("Export functionality coming soon")
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Laporan Absensi Bulanan Karyawan</h1>
        <p className="text-muted-foreground">
          Laporan kehadiran karyawan dalam format kalender bulanan
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
          <CardDescription>Pilih periode dan cabang</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Periode</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Jabatan</Label>
              <Select value={selectedRole || "all"} onValueChange={(value) => setSelectedRole(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Jabatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jabatan</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nama Perusahaan</Label>
              <Input
                placeholder="PT. Shoesfast Indonesia"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={fetchReport} disabled={loading}>
              <Calendar className="h-4 w-4 mr-2" />
              {loading ? "Memuat..." : "Tampilkan Laporan"}
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {!loading && users.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Total Hadir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {calculateSummaryStats().totalPresent}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Karyawan hadir tepat waktu
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                Total Terlambat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {calculateSummaryStats().totalLate}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Hadir tetapi terlambat
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Total Absent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {calculateSummaryStats().totalAbsent}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tidak hadir tanpa keterangan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-blue-600" />
                Total Izin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {calculateSummaryStats().totalLeave}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Izin/Sakit/Cuti (disetujui)
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Keterangan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-bold text-lg">✓</span>
              <span>Hadir</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-600 font-bold text-lg">T</span>
              <span>Terlambat</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-bold text-lg">A</span>
              <span>Tidak Hadir (Absent)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-bold text-lg">I</span>
              <span>Izin/Sakit/Cuti</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-50 border border-red-200"></div>
              <span>Hari Minggu</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: idLocale }).toUpperCase()}
          </CardTitle>
          <CardDescription>
            {users.length} karyawan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20 animate-pulse" />
              <p className="text-sm text-muted-foreground">Memuat data...</p>
            </div>
          ) : (
            renderCalendar()
          )}
        </CardContent>
      </Card>
    </div>
  )
}
