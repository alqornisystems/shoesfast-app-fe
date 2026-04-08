"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Award, TrendingUp, TrendingDown, Users } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface ReportSummary {
  total_employees: number
  avg_performance_score: number
  top_performers: number
  needs_improvement: number
}

interface PerformanceData {
  user_id: number
  user_name: string
  role: string
  total_present: number
  total_late: number
  total_working_hours: number
  total_treatments: number
  completed_treatments: number
  completion_rate: number
  total_notes: number
  performance_score: number
  grade: string
}

interface ReportData {
  summary: ReportSummary
  data: PerformanceData[]
}

export default function LaporanPerformaPage() {
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [filters, setFilters] = useState({
    start_date: format(new Date(new Date().setDate(1)), "yyyy-MM-dd"),
    end_date: format(new Date(), "yyyy-MM-dd"),
    user_id: "",
  })

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("sf_token")
      const params = new URLSearchParams()

      if (filters.start_date) {
        params.append("start_date", String(Math.floor(new Date(filters.start_date).getTime() / 1000)))
      }
      if (filters.end_date) {
        params.append("end_date", String(Math.floor(new Date(filters.end_date + " 23:59:59").getTime() / 1000)))
      }
      if (filters.user_id) {
        params.append("user_id", filters.user_id)
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/performance?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) throw new Error("Failed to fetch")

      const data = await response.json()
      setReportData(data)
    } catch (error: any) {
      toast.error("Gagal memuat laporan")
    } finally {
      setLoading(false)
    }
  }

  const getGradeBadge = (grade: string) => {
    const variants: Record<string, string> = {
      'A': 'bg-green-100 text-green-800 border-green-300',
      'B': 'bg-blue-100 text-blue-800 border-blue-300',
      'C': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'D': 'bg-orange-100 text-orange-800 border-orange-300',
      'E': 'bg-red-100 text-red-800 border-red-300',
    }
    return (
      <Badge variant="outline" className={variants[grade] || ''}>
        {grade}
      </Badge>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Laporan Performa Karyawan</h1>
        <p className="text-muted-foreground">
          Analisis kinerja dan produktivitas karyawan
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
          <CardDescription>Pilih periode dan karyawan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Akhir</Label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Karyawan (Opsional)</Label>
              <Input
                type="number"
                placeholder="User ID"
                value={filters.user_id}
                onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={fetchReport} disabled={loading}>
              {loading ? "Memuat..." : "Tampilkan Laporan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Karyawan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.summary.total_employees}</div>
                <p className="text-xs text-muted-foreground mt-1">Karyawan aktif</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Skor Rata-rata
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.summary.avg_performance_score.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground mt-1">Dari 100 poin</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4 text-green-600" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{reportData.summary.top_performers}</div>
                <p className="text-xs text-muted-foreground mt-1">Skor ≥ 80</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                  Perlu Perbaikan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{reportData.summary.needs_improvement}</div>
                <p className="text-xs text-muted-foreground mt-1">Skor &lt; 60</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detail Performa Karyawan</CardTitle>
              <CardDescription>
                Skor berdasarkan kehadiran (30%), pengerjaan (40%), dan catatan (30%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead className="text-center">Hadir</TableHead>
                      <TableHead className="text-center">Terlambat</TableHead>
                      <TableHead className="text-right">Jam Kerja</TableHead>
                      <TableHead className="text-center">Treatment</TableHead>
                      <TableHead className="text-center">Selesai</TableHead>
                      <TableHead className="text-center">Catatan</TableHead>
                      <TableHead className="text-right">Skor</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.data.map((employee) => (
                      <TableRow key={employee.user_id}>
                        <TableCell className="font-medium">{employee.user_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {employee.role || 'Staff'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{employee.total_present}</TableCell>
                        <TableCell className="text-center">
                          {employee.total_late > 0 && (
                            <span className="text-orange-600 font-medium">{employee.total_late}</span>
                          )}
                          {employee.total_late === 0 && "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {employee.total_working_hours.toFixed(1)}h
                        </TableCell>
                        <TableCell className="text-center">{employee.total_treatments}</TableCell>
                        <TableCell className="text-center">
                          {employee.completed_treatments} ({employee.completion_rate.toFixed(0)}%)
                        </TableCell>
                        <TableCell className="text-center">{employee.total_notes}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono font-bold text-lg">
                            {employee.performance_score.toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {getGradeBadge(employee.grade)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Performance Breakdown Info */}
          <Card>
            <CardHeader>
              <CardTitle>Cara Perhitungan Skor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="font-medium">Kehadiran (30%)</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    (Hadir - Terlambat) / Hadir × 30
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium">Pengerjaan (40%)</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Treatment Selesai / Total × 40
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="font-medium">Catatan Harian (30%)</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Min(Catatan × 3, 30) - Max 30 poin
                  </p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Grade:</p>
                <div className="flex gap-4 flex-wrap">
                  <span className="text-xs">A: 90-100</span>
                  <span className="text-xs">B: 80-89</span>
                  <span className="text-xs">C: 70-79</span>
                  <span className="text-xs">D: 60-69</span>
                  <span className="text-xs">E: &lt; 60</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!reportData && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Award className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">
              Klik "Tampilkan Laporan" untuk melihat data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
