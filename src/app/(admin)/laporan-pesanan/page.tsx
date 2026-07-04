"use client"

import { format } from "date-fns"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingBag, Package, TrendingUp, BarChart3 } from "lucide-react"
import { useReport } from "@/hooks/use-report"
import { ReportShell } from "@/components/report-shell"
import { formatCurrency, formatDate } from "@/lib/utils"
import { exportTableToExcel, formatCurrencyForExport, formatDateForExport } from "@/lib/export-utils"

interface Summary {
  total_items: number
  total_revenue: number
  average_per_item: number
}

interface ServiceBreakdown {
  id: number
  service_name: string
  total_count: number
  total_revenue: number
  avg_price: number
}

interface StatusBreakdown {
  status: number
  status_label: string
  count: number
}

interface OrderItem {
  id: number
  order_code: string
  order_date: number
  order_status: string
  customer_name: string
  customer_phone: string
  branch_name: string
  service_name: string
  price: number
  discount: number
  net_price: number
}

interface OrdersReport {
  summary: Summary
  service_breakdown: ServiceBreakdown[]
  status_breakdown: StatusBreakdown[]
  data: OrderItem[]
}

function getStatusBadgeVariant(status: string) {
  if (status === "Pending") return "outline"
  if (status === "Process") return "default"
  if (status === "Done") return "secondary"
  if (status === "Canceled") return "destructive"
  return "outline"
}

export default function LaporanPesananPage() {
  const report = useReport<OrdersReport>({ endpoint: "/api/reports/orders" })
  const data = report.data

  const summary = data?.summary ?? null
  const serviceBreakdown = data?.service_breakdown ?? []
  const statusBreakdown = data?.status_breakdown ?? []
  const items = data?.data ?? []

  const handleExport = () => {
    if (!items.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = items.map((item) => ({
      order_date: formatDateForExport(item.order_date),
      order_code: item.order_code,
      customer_name: item.customer_name,
      customer_phone: item.customer_phone,
      service_name: item.service_name,
      price: formatCurrencyForExport(item.price),
      discount: formatCurrencyForExport(item.discount),
      net_price: formatCurrencyForExport(item.net_price),
      order_status: item.order_status,
    }))

    exportTableToExcel(
      exportData,
      [
        { key: "order_date", label: "Tanggal" },
        { key: "order_code", label: "Kode Order" },
        { key: "customer_name", label: "Nama Pelanggan" },
        { key: "customer_phone", label: "No. HP" },
        { key: "service_name", label: "Layanan" },
        { key: "price", label: "Harga" },
        { key: "discount", label: "Diskon" },
        { key: "net_price", label: "Total" },
        { key: "order_status", label: "Status" },
      ],
      `Laporan_Pesanan_${format(new Date(report.startDate), "dd-MM-yyyy")}_${format(new Date(report.endDate), "dd-MM-yyyy")}`
    )

    toast.success("Data berhasil diekspor ke Excel")
  }

  return (
    <ReportShell
      title="Laporan Pesanan & Item"
      description="Analisis detail pesanan dan breakdown per layanan"
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
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Item</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_items}</div>
                <p className="text-xs text-muted-foreground">Item layanan diproses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.total_revenue)}
                </div>
                <p className="text-xs text-muted-foreground">Pendapatan bersih</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rata-rata per Item</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.average_per_item)}</div>
                <p className="text-xs text-muted-foreground">Nilai rata-rata</p>
              </CardContent>
            </Card>
          </div>

          {/* Service Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Breakdown per Layanan
              </CardTitle>
              <CardDescription>
                Top layanan berdasarkan jumlah item dan revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Layanan</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        Jumlah Item
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        Total Revenue
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        Harga Rata-rata
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="h-24 text-center text-muted-foreground">
                          Tidak ada data layanan
                        </td>
                      </tr>
                    ) : (
                      serviceBreakdown.map((service) => (
                        <tr
                          key={service.id}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="p-4 align-middle font-medium">{service.service_name}</td>
                          <td className="p-4 align-middle text-right">{service.total_count}</td>
                          <td className="p-4 align-middle text-right font-bold text-green-600">
                            {formatCurrency(service.total_revenue)}
                          </td>
                          <td className="p-4 align-middle text-right">
                            {formatCurrency(service.avg_price)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Breakdown Status Pesanan</CardTitle>
              <CardDescription>Distribusi pesanan berdasarkan status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statusBreakdown.map((item) => (
                  <div
                    key={item.status}
                    className="flex flex-col items-center justify-center p-4 border rounded-lg"
                  >
                    <Badge variant={getStatusBadgeVariant(item.status_label)}>
                      {item.status_label}
                    </Badge>
                    <div className="text-2xl font-bold mt-2">{item.count}</div>
                    <p className="text-xs text-muted-foreground">pesanan</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detail Item Pesanan</CardTitle>
              <CardDescription>
                Daftar lengkap item pesanan (maksimal 500 data terbaru)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Tanggal</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Order</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Pelanggan</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Layanan</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Harga</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Diskon</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Total</th>
                      <th className="h-12 px-4 text-center align-middle font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="h-24 text-center text-muted-foreground">
                          Tidak ada item pesanan
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle text-xs text-muted-foreground">
                            {formatDate(item.order_date)}
                          </td>
                          <td className="p-4 align-middle">
                            <div className="font-medium">{item.order_code}</div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="font-medium text-sm">{item.customer_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.customer_phone}
                            </div>
                          </td>
                          <td className="p-4 align-middle text-sm">{item.service_name}</td>
                          <td className="p-4 align-middle text-right">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="p-4 align-middle text-right text-red-600">
                            {item.discount > 0 ? `-${formatCurrency(item.discount)}` : "-"}
                          </td>
                          <td className="p-4 align-middle text-right font-bold text-green-600">
                            {formatCurrency(item.net_price)}
                          </td>
                          <td className="p-4 align-middle text-center">
                            <Badge variant={getStatusBadgeVariant(item.order_status)}>
                              {item.order_status}
                            </Badge>
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
