"use client"

import { format } from "date-fns"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wrench, Clock, AlertCircle, CheckCircle2, Users } from "lucide-react"
import { useReport } from "@/hooks/use-report"
import { ReportShell } from "@/components/report-shell"
import { exportTableToExcel, formatPercentForExport } from "@/lib/export-utils"

interface Summary {
  total_treatments: number
  completed: number
  in_progress: number
  waiting: number
  overdue: number
  avg_duration_days: number
}

interface TechnicianStat {
  user_id: number | null
  user_name: string
  type: 'internal' | 'vendor'
  total_treatments: number
  completed: number
  in_progress: number
  completion_rate: number
}

interface TreatmentReport {
  summary: Summary
  technician_stats: TechnicianStat[]
}

export default function LaporanPengerjaanPage() {
  const report = useReport<TreatmentReport>({ endpoint: "/api/reports/treatments" })
  const data = report.data
  const summary = data?.summary
  const technicianStats = data?.technician_stats ?? []

  const handleExport = () => {
    if (!technicianStats.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = technicianStats.map(tech => ({
      user_name: tech.user_name,
      total_treatments: tech.total_treatments.toString(),
      completed: tech.completed.toString(),
      in_progress: tech.in_progress.toString(),
      completion_rate: formatPercentForExport(tech.completion_rate)
    }))

    exportTableToExcel(
      exportData,
      [
        { key: "user_name", label: "Teknisi" },
        { key: "total_treatments", label: "Total Treatment" },
        { key: "completed", label: "Selesai" },
        { key: "in_progress", label: "Dalam Proses" },
        { key: "completion_rate", label: "Completion Rate" }
      ],
      `Laporan_Pengerjaan_${format(new Date(report.startDate), "dd-MM-yyyy")}_${format(new Date(report.endDate), "dd-MM-yyyy")}`
    )

    toast.success("Data berhasil diekspor ke Excel")
  }

  return (
    <ReportShell
      title="Laporan Pengerjaan"
      description="Analisis produktivitas & durasi treatment"
      startDate={report.startDate}
      endDate={report.endDate}
      setStartDate={report.setStartDate}
      setEndDate={report.setEndDate}
      refetch={report.refetch}
      loading={report.loading}
      hasData={!!summary}
      onExportExcel={handleExport}
    >
      {summary && (
        <>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.total_treatments}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><CheckCircle2 className="h-4 w-4"/>Selesai</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{summary.completed}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Wrench className="h-4 w-4"/>Proses</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{summary.in_progress}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Clock className="h-4 w-4"/>Waiting</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{summary.waiting}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><AlertCircle className="h-4 w-4"/>Overdue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{summary.overdue}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Rata-rata</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.avg_duration_days}</div><p className="text-xs text-muted-foreground">hari</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Produktivitas Teknisi</CardTitle><CardDescription>Performance setiap teknisi</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b"><tr><th className="h-12 px-4 text-left font-medium">Teknisi</th><th className="px-4 text-right font-medium">Total</th><th className="px-4 text-right font-medium">Selesai</th><th className="px-4 text-right font-medium">Proses</th><th className="px-4 text-center font-medium">Completion Rate</th></tr></thead>
                  <tbody>
                    {technicianStats.map((tech, index) => (
                      <tr key={tech.user_id || `vendor-${index}`} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tech.user_name}</span>
                            {tech.type === 'vendor' && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                                Vendor
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">{tech.total_treatments}</td>
                        <td className="p-4 text-right text-green-600">{tech.completed}</td>
                        <td className="p-4 text-right text-blue-600">{tech.in_progress}</td>
                        <td className="p-4 text-center">
                          <Badge className={tech.completion_rate >= 80 ? "bg-green-600" : tech.completion_rate >= 50 ? "bg-blue-600" : "bg-orange-600"}>
                            {tech.completion_rate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </ReportShell>
  )
}
