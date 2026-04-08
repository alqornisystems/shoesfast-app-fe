"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { format } from "date-fns"
import { TrendingUp, DollarSign, ShoppingCart, Calendar, FileDown, Printer } from "lucide-react"
import { exportTableToExcel, formatCurrencyForExport, formatDateForExport } from "@/lib/export-utils"

interface Summary {
  total_orders: number
  total_revenue: number
  average_order_value: number
}

interface DailySale {
  sale_date: string
  total_orders: number
  total_revenue: number
}

interface StatusBreakdown {
  status: number
  status_label: string
  count: number
  revenue: number
}

export default function LaporanPenjualanPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [dailySales, setDailySales] = useState<DailySale[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([])

  // Filters
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    // Set default to current month
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    setStartDate(format(firstDay, "yyyy-MM-dd"))
    setEndDate(format(lastDay, "yyyy-MM-dd"))
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport()
    }
  }, [startDate, endDate])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("sf_token")
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(endDate + " 23:59:59").getTime() / 1000)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/sales?start_date=${startTimestamp}&end_date=${endTimestamp}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch report")
      }

      const data = await response.json()
      setSummary(data.summary)
      setDailySales(data.daily_sales)
      setStatusBreakdown(data.status_breakdown)
    } catch (error: any) {
      toast.error(error.message || "Gagal memuat laporan")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy")
  }

  const handleExport = () => {
    if (!dailySales.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = dailySales.map(sale => ({
      sale_date: formatDate(sale.sale_date),
      total_orders: sale.total_orders.toString(),
      total_revenue: formatCurrencyForExport(sale.total_revenue)
    }))

    exportTableToExcel(
      exportData,
      [
        { key: "sale_date", label: "Tanggal" },
        { key: "total_orders", label: "Jumlah Pesanan" },
        { key: "total_revenue", label: "Total Revenue" }
      ],
      `Laporan_Penjualan_${format(new Date(startDate), "dd-MM-yyyy")}_${format(new Date(endDate), "dd-MM-yyyy")}`
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
          <h1 className="text-3xl font-bold tracking-tight">Laporan Penjualan & Omzet</h1>
          <p className="text-muted-foreground">Analisis penjualan dan revenue bisnis Anda</p>
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

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter Periode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Tanggal Mulai</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Tanggal Akhir</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReport} disabled={loading} className="w-full">
                {loading ? "Memuat..." : "Tampilkan Laporan"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Memuat laporan...</p>
          </div>
        </div>
      ) : summary ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_orders}</div>
                <p className="text-xs text-muted-foreground">Periode yang dipilih</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.total_revenue)}</div>
                <p className="text-xs text-muted-foreground">Omzet bersih</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rata-rata Nilai Order</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.average_order_value)}</div>
                <p className="text-xs text-muted-foreground">Per pesanan</p>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Breakdown Status Pesanan</CardTitle>
              <CardDescription>Distribusi pesanan berdasarkan status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusBreakdown.map((item) => (
                  <div key={item.status} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.status_label}</p>
                      <p className="text-sm text-muted-foreground">{item.count} pesanan</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(item.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Sales Table */}
          <Card>
            <CardHeader>
              <CardTitle>Penjualan Harian</CardTitle>
              <CardDescription>Detail penjualan per hari</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-auto max-h-[500px]">
                <table className="w-full caption-bottom text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Tanggal</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Jumlah Pesanan</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySales.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="h-24 text-center text-muted-foreground">
                          Tidak ada data penjualan pada periode ini
                        </td>
                      </tr>
                    ) : (
                      dailySales.map((sale, index) => (
                        <tr key={index} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle">{formatDate(sale.sale_date)}</td>
                          <td className="p-4 align-middle text-right">{sale.total_orders}</td>
                          <td className="p-4 align-middle text-right font-medium">
                            {formatCurrency(sale.total_revenue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Pilih periode untuk melihat laporan</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
