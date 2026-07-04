"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Award, TrendingUp, TrendingDown, Users } from "lucide-react"
import { useReport } from "@/hooks/use-report"
import { ReportShell } from "@/components/report-shell"

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
  const [userId, setUserId] = useState("")

  const report = useReport<ReportData>({
    endpoint: "/api/reports/performance",
    params: { user_id: userId || undefined },
  })
  const data = report.data

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
    <ReportShell
      title="Laporan Performa Karyawan"
      description="Analisis kinerja dan produktivitas karyawan"
      startDate={report.startDate}
      endDate={report.endDate}
      setStartDate={report.setStartDate}
      setEndDate={report.setEndDate}
      refetch={report.refetch}
      loading={report.loading}
      hasData={!!data}
      emptyMessage='Klik "Tampilkan Laporan" untuk melihat data'
      actions={
        <Input
          type="number"
          placeholder="Filter User ID (opsional)"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-48"
        />
      }
    >
      {data && (
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
                <div className="text-2xl font-bold">{data.summary.total_employees}</div>
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
                <div className="text-2xl font-bold">{data.summary.avg_performance_score.toFixed(1)}</div>
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
                <div className="text-2xl font-bold text-green-600">{data.summary.top_performers}</div>
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
                <div className="text-2xl font-bold text-orange-600">{data.summary.needs_improvement}</div>
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
                    {data.data.map((employee) => (
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
    </ReportShell>
  )
}
