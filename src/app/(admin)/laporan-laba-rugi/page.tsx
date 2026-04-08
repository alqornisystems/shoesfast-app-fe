"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { format } from "date-fns"
import { TrendingUp, TrendingDown, Calendar, DollarSign, Percent, BarChart3, FileDown, Printer } from "lucide-react"
import { exportTableToExcel, formatCurrencyForExport, formatPercentForExport } from "@/lib/export-utils"

interface Summary {
  total_revenue: number
  total_cogs: number
  gross_profit: number
  gross_margin_percent: number
  total_expenses: number
  general_expenses: number
  operational_expenses: number
  net_profit: number
  net_margin_percent: number
}

interface MonthlyData {
  month: string
  month_label: string
  revenue: number
  expenses: number
  profit: number
}

export default function LaporanLabaRugiPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])

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
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/profit-loss?start_date=${startTimestamp}&end_date=${endTimestamp}`,
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
      setMonthlyData(data.monthly_data || [])
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

  const handleExport = () => {
    if (!monthlyData.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = monthlyData.map(month => ({
      month_label: month.month_label,
      revenue: formatCurrencyForExport(month.revenue),
      expenses: formatCurrencyForExport(month.expenses),
      profit: formatCurrencyForExport(month.profit),
      status: month.profit >= 0 ? "Profit" : "Loss"
    }))

    exportTableToExcel(
      exportData,
      [
        { key: "month_label", label: "Bulan" },
        { key: "revenue", label: "Revenue" },
        { key: "expenses", label: "Expenses" },
        { key: "profit", label: "Profit" },
        { key: "status", label: "Status" }
      ],
      `Laporan_Laba_Rugi_${format(new Date(startDate), "dd-MM-yyyy")}_${format(new Date(endDate), "dd-MM-yyyy")}`
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
          <h1 className="text-3xl font-bold tracking-tight">Laporan Laba Rugi</h1>
          <p className="text-muted-foreground">Profit & Loss Statement - Analisis kinerja keuangan</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!summary || !monthlyData.length}>
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
          {/* Summary Statement */}
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Laba Rugi</CardTitle>
              <CardDescription>Profit & Loss Summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Revenue */}
                <div className="flex justify-between items-center py-3 border-b">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-lg">Pendapatan (Revenue)</span>
                  </div>
                  <span className="font-bold text-lg text-green-600">
                    {formatCurrency(summary.total_revenue)}
                  </span>
                </div>

                {/* COGS */}
                <div className="flex justify-between items-center py-3 border-b pl-8">
                  <span className="text-muted-foreground">Harga Pokok Penjualan (COGS)</span>
                  <span className="font-medium text-red-600">
                    ({formatCurrency(summary.total_cogs)})
                  </span>
                </div>

                {/* Gross Profit */}
                <div className="flex justify-between items-center py-3 border-b bg-blue-50 dark:bg-blue-950 px-4 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Laba Kotor (Gross Profit)</span>
                    <span className="text-sm text-muted-foreground">
                      (Margin: {summary.gross_margin_percent}%)
                    </span>
                  </div>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(summary.gross_profit)}
                  </span>
                </div>

                {/* Operating Expenses */}
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="font-semibold">Beban Operasional</span>
                  <span className="font-medium text-red-600">
                    ({formatCurrency(summary.total_expenses)})
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 pl-8">
                  <span className="text-sm text-muted-foreground">• Pengeluaran Umum</span>
                  <span className="text-sm text-red-600">
                    ({formatCurrency(summary.general_expenses)})
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 pl-8 border-b">
                  <span className="text-sm text-muted-foreground">• Pengeluaran Operasional</span>
                  <span className="text-sm text-red-600">
                    ({formatCurrency(summary.operational_expenses)})
                  </span>
                </div>

                {/* Net Profit */}
                <div
                  className={`flex justify-between items-center py-4 px-4 rounded-lg ${
                    summary.net_profit >= 0
                      ? "bg-green-50 dark:bg-green-950 border-2 border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {summary.net_profit >= 0 ? (
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    )}
                    <div>
                      <div className="font-bold text-lg">
                        Laba Bersih (Net Profit)
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Net Margin: {summary.net_margin_percent}%
                      </div>
                    </div>
                  </div>
                  <span
                    className={`font-bold text-2xl ${
                      summary.net_profit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(summary.net_profit)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.total_revenue)}
                </div>
                <p className="text-xs text-muted-foreground">Pendapatan kotor</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary.gross_profit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Margin: {summary.gross_margin_percent}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.total_expenses)}
                </div>
                <p className="text-xs text-muted-foreground">COGS + Operating</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    summary.net_profit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(summary.net_profit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Margin: {summary.net_margin_percent}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend */}
          {monthlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Trend Bulanan
                </CardTitle>
                <CardDescription>Perbandingan revenue, expenses, dan profit per bulan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium">Bulan</th>
                        <th className="h-12 px-4 text-right align-middle font-medium">Revenue</th>
                        <th className="h-12 px-4 text-right align-middle font-medium">Expenses</th>
                        <th className="h-12 px-4 text-right align-middle font-medium">Profit</th>
                        <th className="h-12 px-4 text-center align-middle font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((month) => (
                        <tr key={month.month} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle font-medium">{month.month_label}</td>
                          <td className="p-4 align-middle text-right text-green-600">
                            {formatCurrency(month.revenue)}
                          </td>
                          <td className="p-4 align-middle text-right text-red-600">
                            {formatCurrency(month.expenses)}
                          </td>
                          <td
                            className={`p-4 align-middle text-right font-bold ${
                              month.profit >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatCurrency(month.profit)}
                          </td>
                          <td className="p-4 align-middle text-center">
                            {month.profit >= 0 ? (
                              <TrendingUp className="h-5 w-5 text-green-600 inline" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-red-600 inline" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle>Tentang Laporan Laba Rugi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Laporan Laba Rugi (Profit & Loss Statement)</strong> menunjukkan kinerja
                keuangan bisnis dalam periode tertentu.
              </p>
              <div className="mt-4 space-y-1">
                <p>
                  <strong>Gross Profit</strong> = Revenue - COGS
                </p>
                <p>
                  <strong>Net Profit</strong> = Gross Profit - Operating Expenses
                </p>
                <p>
                  <strong>Gross Margin</strong> = (Gross Profit / Revenue) × 100%
                </p>
                <p>
                  <strong>Net Margin</strong> = (Net Profit / Revenue) × 100%
                </p>
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
