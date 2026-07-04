"use client"

import { format } from "date-fns"
import { toast } from "sonner"
import { TrendingUp, DollarSign, ShoppingCart } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useReport } from "@/hooks/use-report"
import { ReportShell } from "@/components/report-shell"
import { formatCurrency } from "@/lib/utils"
import { exportTableToExcel, formatCurrencyForExport } from "@/lib/export-utils"

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

interface SalesReport {
  summary: Summary
  daily_sales: DailySale[]
  status_breakdown: StatusBreakdown[]
}

function formatDate(dateString: string) {
  return format(new Date(dateString), "dd MMM yyyy")
}

export default function LaporanPenjualanPage() {
  const report = useReport<SalesReport>({ endpoint: "/api/reports/sales" })
  const data = report.data

  const handleExport = () => {
    if (!data?.daily_sales?.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    exportTableToExcel(
      data.daily_sales.map((sale) => ({
        sale_date: formatDate(sale.sale_date),
        total_orders: sale.total_orders.toString(),
        total_revenue: formatCurrencyForExport(sale.total_revenue),
      })),
      [
        { key: "sale_date", label: "Tanggal" },
        { key: "total_orders", label: "Jumlah Pesanan" },
        { key: "total_revenue", label: "Total Revenue" },
      ],
      `Laporan_Penjualan_${format(new Date(report.startDate), "dd-MM-yyyy")}_${format(new Date(report.endDate), "dd-MM-yyyy")}`
    )

    toast.success("Data berhasil diekspor ke Excel")
  }

  return (
    <ReportShell
      title="Laporan Penjualan & Omzet"
      description="Analisis penjualan dan revenue bisnis Anda"
      startDate={report.startDate}
      endDate={report.endDate}
      setStartDate={report.setStartDate}
      setEndDate={report.setEndDate}
      refetch={report.refetch}
      loading={report.loading}
      hasData={!!data?.summary}
      onExportExcel={handleExport}
    >
      {data?.summary && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.total_orders}</div>
                <p className="text-xs text-muted-foreground">Periode yang dipilih</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.summary.total_revenue)}</div>
                <p className="text-xs text-muted-foreground">Omzet bersih</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rata-rata Nilai Order</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.summary.average_order_value)}</div>
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
                {(data.status_breakdown ?? []).map((item) => (
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
                    {(data.daily_sales ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="h-24 text-center text-muted-foreground">
                          Tidak ada data penjualan pada periode ini
                        </td>
                      </tr>
                    ) : (
                      data.daily_sales.map((sale, index) => (
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
      )}
    </ReportShell>
  )
}
