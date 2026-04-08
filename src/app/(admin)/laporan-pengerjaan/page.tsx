"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"
import { Wrench, Calendar, Clock, AlertCircle, CheckCircle2, Users, FileDown, Printer } from "lucide-react"
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

export default function LaporanPengerjaanPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [technicianStats, setTechnicianStats] = useState<TechnicianStat[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setStartDate(format(firstDay, "yyyy-MM-dd"))
    setEndDate(format(lastDay, "yyyy-MM-dd"))
  }, [])

  useEffect(() => {
    if (startDate && endDate) fetchReport()
  }, [startDate, endDate])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("sf_token")
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(endDate + " 23:59:59").getTime() / 1000)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/treatments?start_date=${startTimestamp}&end_date=${endTimestamp}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )

      if (!response.ok) throw new Error("Failed to fetch report")
      const data = await response.json()
      setSummary(data.summary)
      setTechnicianStats(data.technician_stats)
    } catch (error: any) {
      toast.error(error.message || "Gagal memuat laporan")
    } finally {
      setLoading(false)
    }
  }

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
      `Laporan_Pengerjaan_${format(new Date(startDate), "dd-MM-yyyy")}_${format(new Date(endDate), "dd-MM-yyyy")}`
    )

    toast.success("Data berhasil diekspor ke Excel")
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Pengerjaan</h1>
          <p className="text-muted-foreground">Analisis produktivitas & durasi treatment</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!summary}>
            <FileDown className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!summary}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Filter Periode</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Tanggal Mulai</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Tanggal Akhir</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            <div className="flex items-end"><Button onClick={fetchReport} disabled={loading} className="w-full">{loading ? "Memuat..." : "Tampilkan"}</Button></div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      ) : summary ? (
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
      ) : (
        <Card><CardContent className="flex items-center justify-center min-h-[400px]"><div className="text-center"><Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Pilih periode</p></div></CardContent></Card>
      )}
    </div>
  )
}
