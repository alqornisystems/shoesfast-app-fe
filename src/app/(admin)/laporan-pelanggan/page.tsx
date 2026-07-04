"use client"

import { format } from "date-fns"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, DollarSign, Repeat, TrendingUp, Star } from "lucide-react"
import { useReport } from "@/hooks/use-report"
import { ReportShell } from "@/components/report-shell"
import { formatCurrency, formatDate } from "@/lib/utils"
import { exportTableToExcel, formatCurrencyForExport } from "@/lib/export-utils"

interface Summary {
  total_customers: number
  repeat_customers: number
  repeat_rate_percent: number
  total_revenue: number
  avg_order_value: number
}

interface Customer {
  customer_id: number
  customer_name: string
  customer_phone: string
  total_orders: number
  total_spent: number
  avg_order_value: number
  last_order_date: number
}

interface CustomerReport {
  summary: Summary
  top_customers: Customer[]
}

export default function LaporanPelangganPage() {
  const report = useReport<CustomerReport>({ endpoint: "/api/reports/customers" })
  const data = report.data
  const summary = data?.summary
  const topCustomers = data?.top_customers ?? []

  const handleExport = () => {
    if (!topCustomers.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = topCustomers.map((customer) => ({
      customer_name: customer.customer_name,
      customer_phone: customer.customer_phone,
      total_orders: customer.total_orders.toString(),
      total_spent: formatCurrencyForExport(customer.total_spent),
      avg_order_value: formatCurrencyForExport(customer.avg_order_value),
      last_order_date: customer.last_order_date ? formatDate(customer.last_order_date) : "-",
      status: customer.total_orders >= 5 ? "VIP" : customer.total_orders > 1 ? "Repeat" : "New",
    }))

    exportTableToExcel(
      exportData,
      [
        { key: "customer_name", label: "Nama Pelanggan" },
        { key: "customer_phone", label: "No. HP" },
        { key: "total_orders", label: "Total Order" },
        { key: "total_spent", label: "Total Spending" },
        { key: "avg_order_value", label: "Avg Order Value" },
        { key: "last_order_date", label: "Last Order" },
        { key: "status", label: "Status" },
      ],
      `Laporan_Pelanggan_${format(new Date(report.startDate), "dd-MM-yyyy")}_${format(new Date(report.endDate), "dd-MM-yyyy")}`
    )

    toast.success("Data berhasil diekspor ke Excel")
  }

  return (
    <ReportShell
      title="Laporan Pelanggan"
      description="Customer Analytics & Loyalty"
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
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Total Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_customers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <Repeat className="h-4 w-4" />
                  Repeat Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{summary.repeat_customers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  Repeat Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.repeat_rate_percent}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_revenue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Avg Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.avg_order_value)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top 20 Pelanggan</CardTitle>
              <CardDescription>Customer dengan total spending tertinggi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="h-12 px-4 text-left font-medium">Pelanggan</th>
                      <th className="px-4 text-right font-medium">Total Order</th>
                      <th className="px-4 text-right font-medium">Total Spending</th>
                      <th className="px-4 text-right font-medium">Avg Order</th>
                      <th className="px-4 text-left font-medium">Last Order</th>
                      <th className="px-4 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((customer) => (
                      <tr key={customer.customer_id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="font-medium">{customer.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{customer.customer_phone}</div>
                        </td>
                        <td className="p-4 text-right">{customer.total_orders}</td>
                        <td className="p-4 text-right font-bold text-green-600">{formatCurrency(customer.total_spent)}</td>
                        <td className="p-4 text-right">{formatCurrency(customer.avg_order_value)}</td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {customer.last_order_date ? formatDate(customer.last_order_date) : "-"}
                        </td>
                        <td className="p-4 text-center">
                          <Badge className={customer.total_orders >= 5 ? "bg-purple-600" : customer.total_orders > 1 ? "bg-blue-600" : "bg-gray-500"}>
                            {customer.total_orders >= 5 ? "VIP" : customer.total_orders > 1 ? "Repeat" : "New"}
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
