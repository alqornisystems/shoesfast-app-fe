"use client"

import { format } from "date-fns"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart2, DollarSign, Percent, TrendingUp } from "lucide-react"
import { useReport } from "@/hooks/use-report"
import { ReportShell } from "@/components/report-shell"
import { formatCurrency } from "@/lib/utils"
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

interface HppReport {
  summary: Summary
  data: ServiceHpp[]
}

function getMarginBadge(margin: number) {
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

export default function LaporanHppPage() {
  const report = useReport<HppReport>({ endpoint: "/api/reports/hpp" })
  const data = report.data
  const summary = data?.summary ?? null
  const services = data?.data ?? []

  const handleExport = () => {
    if (!services.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = services.map((service) => ({
      service_name: service.service_name,
      total_sold: service.total_sold.toString(),
      avg_price: formatCurrencyForExport(service.avg_price),
      hpp_per_unit: formatCurrencyForExport(service.hpp_per_unit),
      total_revenue: formatCurrencyForExport(service.total_revenue),
      total_cogs: formatCurrencyForExport(service.total_cogs),
      gross_profit: formatCurrencyForExport(service.gross_profit),
      margin_percent: formatPercentForExport(service.margin_percent),
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
        { key: "margin_percent", label: "Margin" },
      ],
      `Laporan_HPP_${format(new Date(report.startDate), "dd-MM-yyyy")}_${format(new Date(report.endDate), "dd-MM-yyyy")}`
    )

    toast.success("Data berhasil diekspor ke Excel")
  }

  return (
    <ReportShell
      title="Laporan HPP"
      description="Analisis Harga Pokok Penjualan dan Profit Margin per Layanan"
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
      )}
    </ReportShell>
  )
}
