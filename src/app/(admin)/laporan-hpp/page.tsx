"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"
import { BarChart2, Calendar, DollarSign, Percent, TrendingUp, FileDown, Printer } from "lucide-react"
import { exportTableToExcel, formatCurrencyForExport, formatPercentForExport } from "@/lib/export-utils"

interface Summary {
  total_revenue: number
  total_cogs: number
  total_gross_profit: number
  overall_margin_percent: number
  total_services: number
}

interface ServiceHpp {
  service_id: number
  service_name: string
  total_sold: number
  total_revenue: number
  avg_price: number
  hpp_per_unit: number
  total_cogs: number
  gross_profit: number
  margin_percent: number
}

export default function LaporanHppPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [services, setServices] = useState<ServiceHpp[]>([])

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
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/hpp?start_date=${startTimestamp}&end_date=${endTimestamp}`,
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
      setServices(data.data)
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

  const getMarginBadge = (margin: number) => {
    if (margin >= 50) {
      return <Badge className="bg-green-600">Excellent ({margin.toFixed(1)}%)</Badge>
    } else if (margin >= 30) {
      return <Badge className="bg-blue-600">Good ({margin.toFixed(1)}%)</Badge>
    } else if (margin >= 15) {
      return <Badge className="bg-yellow-600">Fair ({margin.toFixed(1)}%)</Badge>
    } else if (margin > 0) {
      return <Badge className="bg-orange-600">Low ({margin.toFixed(1)}%)</Badge>
    } else {
      return <Badge variant="destructive">Loss ({margin.toFixed(1)}%)</Badge>
    }
  }

  const handleExport = () => {
    if (!services.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = services.map(service => ({
      service_name: service.service_name,
      total_sold: service.total_sold.toString(),
      avg_price: formatCurrencyForExport(service.avg_price),
      hpp_per_unit: formatCurrencyForExport(service.hpp_per_unit),
      total_revenue: formatCurrencyForExport(service.total_revenue),
      total_cogs: formatCurrencyForExport(service.total_cogs),
      gross_profit: formatCurrencyForExport(service.gross_profit),
      margin_percent: formatPercentForExport(service.margin_percent)
    }))

    exportTableToExcel(
      exportData,
      [
        { key: "service_name", label: "Layanan" },
        { key: "total_sold", label: "Terjual" },
        { key: "avg_price", label: "Harga Rata-rata" },
        { key: "hpp_per_unit", label: "HPP per Unit" },
        { key: "total_revenue", label: "Total Revenue" },
        { key: "total_cogs", label: "Total COGS" },
        { key: "gross_profit", label: "Gross Profit" },
        { key: "margin_percent", label: "Margin" }
      ],
      `Laporan_HPP_${format(new Date(startDate), "dd-MM-yyyy")}_${format(new Date(endDate), "dd-MM-yyyy")}`
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
          <h1 className="text-3xl font-bold tracking-tight">Laporan HPP</h1>
          <p className="text-muted-foreground">
            Analisis Harga Pokok Penjualan dan Profit Margin per Layanan
          </p>
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
                <CardTitle className="text-sm font-medium">Total COGS</CardTitle>
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.total_cogs)}
                </div>
                <p className="text-xs text-muted-foreground">Harga Pokok Penjualan</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary.total_gross_profit)}
                </div>
                <p className="text-xs text-muted-foreground">Laba kotor</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.overall_margin_percent}%</div>
                <p className="text-xs text-muted-foreground">Margin rata-rata</p>
              </CardContent>
            </Card>
          </div>

          {/* HPP Breakdown per Service */}
          <Card>
            <CardHeader>
              <CardTitle>Breakdown HPP per Layanan</CardTitle>
              <CardDescription>
                Analisis profitabilitas setiap layanan berdasarkan HPP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Layanan</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Terjual</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        Harga Rata-rata
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        HPP per Unit
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        Total Revenue
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        Total COGS
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        Gross Profit
                      </th>
                      <th className="h-12 px-4 text-center align-middle font-medium">
                        Margin
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="h-24 text-center text-muted-foreground">
                          Tidak ada data layanan pada periode ini
                        </td>
                      </tr>
                    ) : (
                      services.map((service) => (
                        <tr
                          key={service.service_id}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="p-4 align-middle font-medium">
                            {service.service_name}
                          </td>
                          <td className="p-4 align-middle text-right">{service.total_sold}</td>
                          <td className="p-4 align-middle text-right">
                            {formatCurrency(service.avg_price)}
                          </td>
                          <td className="p-4 align-middle text-right text-red-600">
                            {formatCurrency(service.hpp_per_unit)}
                          </td>
                          <td className="p-4 align-middle text-right font-bold text-green-600">
                            {formatCurrency(service.total_revenue)}
                          </td>
                          <td className="p-4 align-middle text-right font-bold text-red-600">
                            {formatCurrency(service.total_cogs)}
                          </td>
                          <td className="p-4 align-middle text-right font-bold text-blue-600">
                            {formatCurrency(service.gross_profit)}
                          </td>
                          <td className="p-4 align-middle text-center">
                            {getMarginBadge(service.margin_percent)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Tentang Laporan HPP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>HPP (Harga Pokok Penjualan / COGS)</strong> adalah total biaya yang
                dikeluarkan untuk menghasilkan produk atau layanan yang dijual.
              </p>
              <p>
                <strong>Gross Profit</strong> = Revenue - COGS
              </p>
              <p>
                <strong>Profit Margin</strong> = (Gross Profit / Revenue) × 100%
              </p>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                <Badge className="bg-green-600 justify-center">Excellent: 50%+</Badge>
                <Badge className="bg-blue-600 justify-center">Good: 30-50%</Badge>
                <Badge className="bg-yellow-600 justify-center">Fair: 15-30%</Badge>
                <Badge className="bg-orange-600 justify-center">Low: 0-15%</Badge>
                <Badge variant="destructive" className="justify-center">
                  Loss: {"<"}0%
                </Badge>
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
